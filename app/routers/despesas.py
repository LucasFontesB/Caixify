from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.models.despesa import Despesa, DespesaCategoria
from app.schemas.despesa_schema import (
    CategoriaCreate, CategoriaResponse,
    DespesaCreate, DespesaResponse
)
from app.core.security import require_admin

router = APIRouter(prefix="/despesas", tags=["Despesas"])


# ── Categorias ────────────────────────────────────────────────────────────────

@router.get("/categorias", response_model=list[CategoriaResponse])
def listar_categorias(
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    return db.query(DespesaCategoria).filter(
        DespesaCategoria.empresa_id == user["empresa_id"],
        DespesaCategoria.ativo == True
    ).order_by(DespesaCategoria.nome).all()


@router.post("/categorias", response_model=CategoriaResponse)
def criar_categoria(
    dados: CategoriaCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    if not dados.nome.strip():
        raise HTTPException(status_code=400, detail="Nome é obrigatório")

    existente = db.query(DespesaCategoria).filter(
        DespesaCategoria.empresa_id == user["empresa_id"],
        DespesaCategoria.nome.ilike(dados.nome.strip())
    ).first()

    if existente:
        raise HTTPException(status_code=400, detail="Categoria já existe")

    cat = DespesaCategoria(
        empresa_id=user["empresa_id"],
        nome=dados.nome.strip()
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categorias/{categoria_id}")
def desativar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    cat = db.query(DespesaCategoria).filter(
        DespesaCategoria.id == categoria_id,
        DespesaCategoria.empresa_id == user["empresa_id"]
    ).first()

    if not cat:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    cat.ativo = False
    db.commit()
    return {"mensagem": "Categoria removida"}


# ── Despesas ──────────────────────────────────────────────────────────────────

@router.get("/")
def listar_despesas(
    limite:      int           = Query(default=50, le=200),
    data_inicio: Optional[date] = Query(default=None),
    data_fim:    Optional[date] = Query(default=None),
    categoria_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    query = db.query(Despesa, DespesaCategoria.nome.label("categoria_nome")) \
              .outerjoin(DespesaCategoria, DespesaCategoria.id == Despesa.categoria_id) \
              .filter(Despesa.empresa_id == user["empresa_id"])

    if data_inicio:
        query = query.filter(Despesa.data_despesa >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        query = query.filter(Despesa.data_despesa <= datetime.combine(data_fim, datetime.max.time()))
    if categoria_id:
        query = query.filter(
            Despesa.categoria_id == categoria_id,
            DespesaCategoria.empresa_id == user["empresa_id"]
        )

    resultados = query.order_by(desc(Despesa.data_despesa)).limit(limite).all()

    return [
        {
            "id":             d.id,
            "categoria_id":   d.categoria_id,
            "categoria_nome": cat_nome,
            "descricao":      d.descricao,
            "valor":          float(d.valor),
            "data_despesa":   d.data_despesa.isoformat(),
        }
        for d, cat_nome in resultados
    ]


@router.post("/")
def criar_despesa(
    dados: DespesaCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    if dados.valor <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")

    if dados.categoria_id:
        cat = db.query(DespesaCategoria).filter(
            DespesaCategoria.id == dados.categoria_id,
            DespesaCategoria.empresa_id == user["empresa_id"]
        ).first()
        if not cat:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")

    despesa = Despesa(
        empresa_id=user["empresa_id"],
        usuario_id=user["user_id"],
        categoria_id=dados.categoria_id,
        descricao=dados.descricao,
        valor=dados.valor,
    )
    db.add(despesa)
    db.commit()
    db.refresh(despesa)

    cat_nome = None
    if despesa.categoria_id:
        cat = db.query(DespesaCategoria).filter(
            DespesaCategoria.id == despesa.categoria_id
        ).first()
        cat_nome = cat.nome if cat else None

    return {
        "id":             despesa.id,
        "categoria_id":   despesa.categoria_id,
        "categoria_nome": cat_nome,
        "descricao":      despesa.descricao,
        "valor":          float(despesa.valor),
        "data_despesa":   despesa.data_despesa.isoformat(),
    }


@router.delete("/{despesa_id}")
def deletar_despesa(
    despesa_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    despesa = db.query(Despesa).filter(
        Despesa.id == despesa_id,
        Despesa.empresa_id == user["empresa_id"]
    ).first()

    if not despesa:
        raise HTTPException(status_code=404, detail="Despesa não encontrada")

    db.delete(despesa)
    db.commit()
    return {"mensagem": "Despesa removida"}
