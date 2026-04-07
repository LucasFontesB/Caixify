from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.superadmin import Fatura, Plano, SuperadminLog
from app.models.empresa import Empresa
from app.schemas.superadmin_schema import FaturaCreate, FaturaPagar, FaturaOut, PlanoCreate, PlanoOut
from app.core.superadmin_auth import get_superadmin_atual
from app.models.superadmin import Superadmin

router = APIRouter(prefix="/superadmin", tags=["superadmin-faturas"])


def _registrar_log(db, superadmin, acao, empresa_id=None, snapshot=None, request=None):
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent") if request else None
    db.add(SuperadminLog(
        superadmin_id=superadmin.id,
        empresa_id=empresa_id,
        acao=acao,
        snapshot=snapshot,
        ip=ip,
        user_agent=ua,
    ))


# ── Planos ────────────────────────────────────────────────────────────────────

@router.get("/planos", response_model=list[PlanoOut])
def listar_planos(
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    return db.query(Plano).filter(Plano.ativo == True).all()


@router.post("/planos", response_model=PlanoOut, status_code=201)
def criar_plano(
    body: PlanoCreate,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    plano = Plano(**body.model_dump())
    db.add(plano)
    db.commit()
    db.refresh(plano)
    return plano


# ── Faturas ───────────────────────────────────────────────────────────────────

@router.get("/faturas")
def listar_faturas(
    status: str | None = None,
    empresa_id: int | None = None,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    q = db.query(Fatura, Empresa.nome.label("empresa_nome")).join(
        Empresa, Empresa.id == Fatura.empresa_id
    )
    if status:
        q = q.filter(Fatura.status == status)
    if empresa_id:
        q = q.filter(Fatura.empresa_id == empresa_id)

    faturas = q.order_by(Fatura.vencimento.desc()).all()

    return [
        {
            "id": f.Fatura.id,
            "empresa_id": f.Fatura.empresa_id,
            "empresa_nome": f.empresa_nome,
            "plano_id": f.Fatura.plano_id,
            "valor": f.Fatura.valor,
            "status": f.Fatura.status,
            "vencimento": f.Fatura.vencimento,
            "pago_em": f.Fatura.pago_em,
            "obs": f.Fatura.obs,
            "created_at": f.Fatura.created_at,
        }
        for f in faturas
    ]


@router.post("/faturas", status_code=201)
def criar_fatura(
    body: FaturaCreate,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    empresa = db.query(Empresa).filter(Empresa.id == body.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    fatura = Fatura(**body.model_dump())
    db.add(fatura)
    db.flush()

    _registrar_log(
        db, superadmin, "criar_fatura",
        empresa_id=body.empresa_id,
        snapshot={"valor": body.valor, "vencimento": str(body.vencimento)},
        request=request,
    )
    db.commit()
    db.refresh(fatura)
    return {"id": fatura.id}


@router.patch("/faturas/{fatura_id}/pagar")
def registrar_pagamento(
    fatura_id: int,
    body: FaturaPagar,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")

    antes = fatura.status
    fatura.status = "pago"
    fatura.pago_em = datetime.utcnow()
    if body.obs:
        fatura.obs = body.obs

    # Se empresa estava bloqueada por inadimplência, reativa
    empresa = db.query(Empresa).filter(Empresa.id == fatura.empresa_id).first()
    reativada = False
    if empresa and not empresa.ativo and getattr(empresa, "motivo_bloqueio", None) == "inadimplencia":
        empresa.ativo = True
        if hasattr(empresa, "motivo_bloqueio"):
            empresa.motivo_bloqueio = None
        reativada = True

    _registrar_log(
        db, superadmin, "registrar_pagamento",
        empresa_id=fatura.empresa_id,
        snapshot={"fatura_id": fatura_id, "antes": antes, "depois": "pago", "reativada": reativada},
        request=request,
    )
    db.commit()
    return {"ok": True, "empresa_reativada": reativada}


@router.patch("/faturas/{fatura_id}/cancelar")
def cancelar_fatura(
    fatura_id: int,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    antes = fatura.status
    fatura.status = "cancelado"
    _registrar_log(
        db, superadmin, "cancelar_fatura",
        empresa_id=fatura.empresa_id,
        snapshot={"fatura_id": fatura_id, "antes": antes},
        request=request,
    )
    db.commit()
    return {"ok": True}


# ── Job manual: marcar vencidas ───────────────────────────────────────────────
# Chame este endpoint via cron diário (ex: curl -X POST /superadmin/faturas/processar-vencimentos)

@router.post("/faturas/processar-vencimentos")
def processar_vencimentos(
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    agora = datetime.utcnow()
    pendentes_vencidas = db.query(Fatura).filter(
        Fatura.status == "pendente",
        Fatura.vencimento < agora,
    ).all()

    bloqueadas = 0
    for fatura in pendentes_vencidas:
        fatura.status = "vencido"

        # Bloqueia empresa automaticamente após vencimento
        empresa = db.query(Empresa).filter(
            Empresa.id == fatura.empresa_id,
            Empresa.ativo == True,
            Empresa.deleted_at == None,
        ).first()
        if empresa:
            empresa.ativo = False
            if hasattr(empresa, "motivo_bloqueio"):
                empresa.motivo_bloqueio = "inadimplencia"
            bloqueadas += 1

    _registrar_log(
        db, superadmin, "processar_vencimentos",
        snapshot={"vencidas": len(pendentes_vencidas), "empresas_bloqueadas": bloqueadas},
        request=request,
    )
    db.commit()
    return {"vencidas": len(pendentes_vencidas), "empresas_bloqueadas": bloqueadas}