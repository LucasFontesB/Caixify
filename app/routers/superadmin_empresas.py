from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.superadmin import Superadmin, Fatura, SuperadminLog, Plano
from app.models.empresa import Empresa         # model existente
from app.models.usuarios import Usuario         # model existente
from app.schemas.superadmin_schema import (
    SuperadminLogin, SuperadminTokenData,
    EmpresaCreate, EmpresaStatusUpdate, EmpresaOut,
    DashboardOut,
)
from app.core.superadmin_auth import (
    verificar_senha, hash_senha, criar_token, get_superadmin_atual
)
from app.core.security import hash_senha  # reutiliza hash do projeto
from fastapi import UploadFile, File
from pathlib import Path

router = APIRouter(prefix="/superadmin", tags=["superadmin"])


# ── Helper: registra log ──────────────────────────────────────────────────────

def registrar_log(
    db: Session,
    superadmin: Superadmin,
    acao: str,
    empresa_id: int | None = None,
    snapshot: dict | None = None,
    request: Request | None = None,
):
    ip = None
    ua = None
    if request:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
    log = SuperadminLog(
        superadmin_id=superadmin.id,
        empresa_id=empresa_id,
        acao=acao,
        snapshot=snapshot,
        ip=ip,
        user_agent=ua,
    )
    db.add(log)


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=SuperadminTokenData)
def login(body: SuperadminLogin, request: Request, db: Session = Depends(get_db)):
    superadmin = db.query(Superadmin).filter(
        Superadmin.login == body.login,
        Superadmin.ativo == True,
    ).first()

    if not superadmin or not verificar_senha(body.senha, superadmin.senha):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    superadmin.last_login_at = datetime.utcnow()
    registrar_log(db, superadmin, "login", request=request)
    db.commit()

    return {"access_token": criar_token(superadmin.id, superadmin.nome)}


# ── Dashboard ─────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    hoje = datetime.utcnow()
    inicio_mes = hoje.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    em_7_dias = hoje + timedelta(days=7)

    total = db.query(func.count(Empresa.id)).filter(
        Empresa.deleted_at.is_(None)
    ).scalar()

    ativas = db.query(func.count(Empresa.id)).filter(
        Empresa.deleted_at.is_(None),
        Empresa.ativo == True
    ).scalar()

    bloqueadas = db.query(func.count(Empresa.id)).filter(
        Empresa.deleted_at.is_(None),
        Empresa.ativo == False
    ).scalar()

    novas_mes = db.query(func.count(Empresa.id)).filter(
        Empresa.deleted_at.is_(None),
        Empresa.created_at >= inicio_mes,
    ).scalar()

    mrr = db.query(func.coalesce(func.sum(Fatura.valor), 0)).filter(
        Fatura.status == "pago",
        Fatura.pago_em >= inicio_mes,
    ).scalar()

    receita_prevista = db.query(func.coalesce(func.sum(Fatura.valor), 0)).filter(
        Fatura.vencimento >= inicio_mes,
        Fatura.status.in_(["pendente", "pago"]),
    ).scalar()

    receita_recebida = db.query(func.coalesce(func.sum(Fatura.valor), 0)).filter(
        Fatura.pago_em >= inicio_mes,
        Fatura.status == "pago",
    ).scalar()

    vencidas = db.query(func.count(Fatura.id)).filter(
        Fatura.status == "vencido"
    ).scalar()

    vencendo_7 = db.query(func.count(Fatura.id)).filter(
        Fatura.status == "pendente",
        Fatura.vencimento <= em_7_dias,
        Fatura.vencimento >= hoje,
    ).scalar()

    return DashboardOut(
        total_empresas=total,
        empresas_ativas=ativas,
        empresas_bloqueadas=bloqueadas,
        empresas_novas_mes=novas_mes,
        mrr=mrr,
        receita_prevista_mes=receita_prevista,
        receita_recebida_mes=receita_recebida,
        faturas_vencidas=vencidas,
        faturas_vencendo_7dias=vencendo_7,
    )


# ── Empresas ──────────────────────────────────────────────────────────────────

@router.get("/empresas")
def listar_empresas(
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    empresas = db.query(Empresa).filter(Empresa.deleted_at == None).order_by(
        Empresa.created_at.desc()
    ).all()

    resultado = []
    for e in empresas:
        fatura_atual = db.query(Fatura).filter(
            Fatura.empresa_id == e.id
        ).order_by(Fatura.vencimento.desc()).first()

        resultado.append({
            "id": e.id,
            "nome": e.nome,
            "cnpj": getattr(e, "cnpj", None),
            "contato": e.telefone,
            "ativo": e.ativo,
            "plano": getattr(e, "plano", "basico"),
            "motivo_bloqueio": getattr(e, "motivo_bloqueio", None),
            "created_at": getattr(e, "created_at", None),
            "fatura_status": fatura_atual.status if fatura_atual else None,
            "fatura_vencimento": fatura_atual.vencimento if fatura_atual else None,
        })

    return resultado


@router.post("/empresas", status_code=201)
def criar_empresa(
    body: EmpresaCreate,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    # Cria a empresa
    empresa = Empresa(
        nome=body.nome,
        cnpj=body.cnpj,
        telefone=body.contato,
    )
    # Campos novos (se existirem no model)
    if hasattr(empresa, "plano"):
        empresa.plano = body.plano

    db.add(empresa)
    db.flush()  # obtém empresa.id antes do commit

    # Cria o primeiro admin da empresa
    usuario = Usuario(
        empresa_id=empresa.id,
        nome=body.admin_nome,
        login=body.admin_login,
        senha_hash=hash_senha(body.admin_senha),
        tipo="admin",
        ativo=True,
    )
    db.add(usuario)

    registrar_log(
        db, superadmin, "criar_empresa",
        empresa_id=empresa.id,
        snapshot={"nome": empresa.nome, "plano": body.plano, "admin_login": body.admin_login},
        request=request,
    )
    db.commit()
    db.refresh(empresa)
    return {"id": empresa.id, "nome": empresa.nome}


@router.get("/empresas/{empresa_id}")
def detalhe_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.deleted_at == None,
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    usuarios = db.query(Usuario).filter(
        Usuario.empresa_id == empresa_id
    ).all()

    faturas = db.query(Fatura).filter(
        Fatura.empresa_id == empresa_id
    ).order_by(Fatura.vencimento.desc()).limit(12).all()

    return {
        "empresa": {
            "id": empresa.id,
            "nome": empresa.nome,
            "cnpj": empresa.cnpj,
            "contato": empresa.telefone,
            "ativo": empresa.ativo,
            "plano": getattr(empresa, "plano", "basico"),
            "motivo_bloqueio": getattr(empresa, "motivo_bloqueio", None),
            "created_at": empresa.created_at,
        },
        "usuarios": [
            {"id": u.id, "nome": u.nome, "login": u.login, "tipo": u.tipo, "ativo": u.ativo}
            for u in usuarios
        ],
        "faturas": [
            {
                "id": f.id, "valor": f.valor, "status": f.status,
                "vencimento": f.vencimento, "pago_em": f.pago_em,
            }
            for f in faturas
        ],
    }


@router.patch("/empresas/{empresa_id}/status")
def atualizar_status_empresa(
    empresa_id: int,
    body: EmpresaStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.deleted_at == None,
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    antes = {"ativo": empresa.ativo, "motivo_bloqueio": getattr(empresa, "motivo_bloqueio", None)}

    empresa.ativo = body.ativo
    if hasattr(empresa, "motivo_bloqueio"):
        empresa.motivo_bloqueio = body.motivo_bloqueio if not body.ativo else None

    registrar_log(
        db, superadmin,
        "bloquear_empresa" if not body.ativo else "ativar_empresa",
        empresa_id=empresa.id,
        snapshot={"antes": antes, "depois": {"ativo": body.ativo, "motivo_bloqueio": body.motivo_bloqueio}},
        request=request,
    )
    db.commit()
    return {"ok": True, "ativo": empresa.ativo}


@router.delete("/empresas/{empresa_id}")
def deletar_empresa(
    empresa_id: int,
    request: Request,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.deleted_at == None,
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    empresa.deleted_at = datetime.utcnow()
    empresa.ativo = False
    registrar_log(
        db, superadmin, "deletar_empresa",
        empresa_id=empresa.id,
        snapshot={"nome": empresa.nome},
        request=request,
    )
    db.commit()
    return {"ok": True}

@router.post("/empresas/{empresa_id}/upload-logo")
async def upload_logo_empresa(
    empresa_id: int,
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    contents = await file.read()

    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Arquivo muito grande")

    import magic
    mime_type = magic.from_buffer(contents, mime=True)
    if mime_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")

    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.deleted_at.is_(None),
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map[mime_type]
    upload_dir = Path("storage/logos")
    upload_dir.mkdir(parents=True, exist_ok=True)

    for old_ext in ["jpg", "png", "webp"]:
        old_path = upload_dir / f"empresa_{empresa_id}.{old_ext}"
        if old_path.exists():
            old_path.unlink()

    caminho = upload_dir / f"empresa_{empresa_id}.{ext}"
    with open(caminho, "wb") as buffer:
        buffer.write(contents)

    url = f"/uploads/empresas/empresa_{empresa_id}.{ext}"
    empresa.logo_url = url

    registrar_log(
        db, superadmin, "upload_logo",
        empresa_id=empresa_id,
        snapshot={"logo_url": url},
        request=request,
    )
    db.commit()
    return {"logo_url": url}