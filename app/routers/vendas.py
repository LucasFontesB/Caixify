from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import date, datetime

from app.database import get_db
from app.models.caixa import CaixaMovimentacao
from app.models.venda import Venda
from app.models.venda_item import VendaItem
from app.models.produto import Produto
from app.models.usuarios import Usuario
from app.schemas.venda_schema import VendaCreate, VendaResponse
from app.core.auth import get_current_user
from app.core.security import require_admin

router = APIRouter(prefix="/vendas", tags=["Vendas"])


# ── Criar venda ───────────────────────────────────────────────────────────────
@router.post("/", response_model=VendaResponse)
def criar_venda(
    dados: VendaCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    venda = Venda(
        empresa_id=user["empresa_id"],
        usuario_id=user["user_id"],
        total=dados.total,
        desconto=dados.desconto,
        forma_pagamento=dados.forma_pagamento,
        turno_id=dados.turno_id
    )

    db.add(venda)
    db.flush()

    caixa = CaixaMovimentacao(
        empresa_id=user["empresa_id"],
        usuario_id=user["user_id"],
        tipo="entrada",
        valor=venda.total,
        forma_pagamento=venda.forma_pagamento,
        descricao=f"Venda {venda.id}"
    )

    db.add(caixa)
    db.commit()
    db.refresh(venda)

    return venda


# ── Listar vendas simples ─────────────────────────────────────────────────────
@router.get("/", response_model=list[VendaResponse])
def listar_vendas(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Venda).filter(
        Venda.empresa_id == user["empresa_id"]
    ).all()


# ── Listar vendas detalhado (com itens e operador) ────────────────────────────
@router.get("/detalhado")
def listar_vendas_detalhado(
    data_inicio:     Optional[date] = Query(default=None),
    data_fim:        Optional[date] = Query(default=None),
    usuario_id:      Optional[int]  = Query(default=None),
    forma_pagamento: Optional[str]  = Query(default=None),
    venda_id:        Optional[int]  = Query(default=None),
    limite:          int            = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    query = (
        db.query(Venda, Usuario.nome.label("operador_nome"))
        .outerjoin(Usuario, Usuario.id == Venda.usuario_id)
        .filter(Venda.empresa_id == user["empresa_id"])
    )

    if venda_id:
        query = query.filter(Venda.id == venda_id)
    if data_inicio:
        query = query.filter(Venda.data_venda >= datetime.combine(data_inicio, datetime.min.time()))
    if data_fim:
        query = query.filter(Venda.data_venda <= datetime.combine(data_fim, datetime.max.time()))
    if usuario_id:
        query = query.filter(Venda.usuario_id == usuario_id)
    if forma_pagamento:
        query = query.filter(Venda.forma_pagamento == forma_pagamento)

    resultados = query.order_by(desc(Venda.data_venda)).limit(limite).all()

    vendas = []
    for venda, operador_nome in resultados:
        # Busca itens da venda com nome do produto
        itens = (
            db.query(VendaItem, Produto.nome.label("produto_nome"))
            .join(Produto, Produto.id == VendaItem.produto_id)
            .filter(VendaItem.venda_id == venda.id)
            .all()
        )

        vendas.append({
            "id":               venda.id,
            "data_venda":       venda.data_venda.isoformat(),
            "operador_nome":    operador_nome,
            "forma_pagamento":  venda.forma_pagamento,
            "total":            float(venda.total),
            "desconto":         float(venda.desconto or 0),
            "turno_id":         venda.turno_id,
            "itens": [
                {
                    "produto_id":     item.produto_id,
                    "produto_nome":   produto_nome,
                    "quantidade":     float(item.quantidade),
                    "preco_unitario": float(item.preco_unitario),
                    "subtotal":       float(item.subtotal),
                }
                for item, produto_nome in itens
            ],
        })

    return vendas