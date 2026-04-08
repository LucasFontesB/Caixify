from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
import html

from app.core.security import require_admin
from app.database import get_db
from app.models.produto import Produto
from app.models.estoque import EstoqueMovimentacao
from app.models.despesa import Despesa
from app.models.caixa import CaixaMovimentacao, Caixa
from app.schemas.estoque_schema import (
    MovimentacaoCreate,
    MovimentacaoResponse,
    MovimentacaoListResponse,
    TipoMovimentacao,
)

router = APIRouter(prefix="/estoque", tags=["Estoque"])


@router.post("/movimentar/", response_model=MovimentacaoResponse)
def movimentar_estoque(
    dados: MovimentacaoCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    produto = db.query(Produto).filter(
        Produto.id == dados.produto_id,
        Produto.empresa_id == user["empresa_id"]
    ).with_for_update().first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if dados.tipo == TipoMovimentacao.entrada:
        novo_estoque = produto.estoque + dados.quantidade
    elif dados.tipo == TipoMovimentacao.saida:
        if produto.estoque < dados.quantidade:
            raise HTTPException(status_code=400, detail="Estoque insuficiente")
        novo_estoque = produto.estoque - dados.quantidade
    elif dados.tipo == TipoMovimentacao.ajuste:
        novo_estoque = dados.quantidade

    nome_seguro = html.escape(produto.nome[:100])

    movimentacao = EstoqueMovimentacao(
        empresa_id=user["empresa_id"],
        produto_id=produto.id,
        tipo=dados.tipo,
        quantidade=dados.quantidade,
        referencia=dados.referencia,
    )

    despesa = None
    receita = None

    if (
        dados.tipo == TipoMovimentacao.entrada
        and dados.registrar_despesa
        and dados.valor_unitario
        and dados.valor_unitario > 0
    ):
        valor_total = dados.valor_unitario * dados.quantidade
        despesa = Despesa(
            empresa_id=user["empresa_id"],
            usuario_id=user["user_id"],
            categoria_id=None,
            descricao=f"Compra de estoque: {nome_seguro} ({int(dados.quantidade)} un.)",
            valor=valor_total,
        )

    if dados.tipo == TipoMovimentacao.saida and dados.registrar_receita:
        valor_receita = (produto.preco_venda or Decimal("0")) * dados.quantidade
        if valor_receita > 0:
            receita = CaixaMovimentacao(
                empresa_id=user["empresa_id"],
                usuario_id=user["user_id"],
                tipo="entrada",
                valor=valor_receita,
                forma_pagamento=None,
                descricao=f"Saída de estoque: {nome_seguro} ({int(dados.quantidade)} un.)",
            )

    try:
        produto.estoque = novo_estoque
        db.add(movimentacao)
        if despesa:
            db.add(despesa)
        if receita:
            db.add(receita)
        db.commit()
        db.refresh(movimentacao)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao registrar movimentação")

    return movimentacao


@router.get("/movimentacoes/", response_model=list[MovimentacaoListResponse])
def listar_movimentacoes(
    limite:     int                    = Query(default=20, ge=1, le=100),
    offset:     int                    = Query(default=0, ge=0),
    produto_id: Optional[int]          = Query(default=None),
    tipo:       Optional[TipoMovimentacao] = Query(default=None),  # Enum validado
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    query = (
        db.query(EstoqueMovimentacao, Produto.nome.label("produto_nome"))
        .join(Produto, Produto.id == EstoqueMovimentacao.produto_id)
        .filter(EstoqueMovimentacao.empresa_id == user["empresa_id"])
    )

    if produto_id:
        query = query.filter(
            EstoqueMovimentacao.produto_id == produto_id,
            Produto.empresa_id == user["empresa_id"]
        )
    if tipo:
        query = query.filter(EstoqueMovimentacao.tipo == tipo)

    resultados = (
        query
        .order_by(desc(EstoqueMovimentacao.data_movimentacao))
        .offset(offset)
        .limit(limite)
        .all()
    )

    return [
        {
            "id":           mov.id,
            "produto_id":   mov.produto_id,
            "produto_nome": produto_nome,
            "tipo":         mov.tipo,
            "quantidade":   float(mov.quantidade),
            "referencia":   mov.referencia,
            "created_at":   mov.data_movimentacao,
        }
        for mov, produto_nome in resultados
    ]