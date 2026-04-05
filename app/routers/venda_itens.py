from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.venda_item import VendaItem
from app.models.produto import Produto
from app.models.venda import Venda
from app.models.estoque import EstoqueMovimentacao  # ← novo
from app.schemas.venda_item_schema import VendaItemCreate, VendaItemResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/venda-itens", tags=["Venda Itens"])


@router.post("/{venda_id}", response_model=VendaItemResponse)
def adicionar_item(
    venda_id: int,
    dados: VendaItemCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    venda = db.query(Venda).filter(
        Venda.id == venda_id,
        Venda.empresa_id == user["empresa_id"]
    ).first()

    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    produto = db.query(Produto).filter(
        Produto.id == dados.produto_id,
        Produto.empresa_id == user["empresa_id"]
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    if produto.estoque < dados.quantidade:
        raise HTTPException(status_code=400, detail="Estoque insuficiente")

    preco_unitario = produto.preco_venda
    subtotal       = preco_unitario * dados.quantidade

    # 📉 baixa estoque
    produto.estoque -= dados.quantidade

    # 📦 registra movimentação de saída no histórico
    movimentacao = EstoqueMovimentacao(
        empresa_id=user["empresa_id"],
        produto_id=produto.id,
        tipo="saida",
        quantidade=dados.quantidade,
        referencia=f"Venda #{venda_id}"
    )
    db.add(movimentacao)

    item = VendaItem(
        venda_id=venda.id,
        produto_id=produto.id,
        quantidade=dados.quantidade,
        preco_unitario=preco_unitario,
        preco_custo=produto.preco_custo,
        subtotal=subtotal
    )
    db.add(item)

    db.commit()
    db.refresh(item)

    return item


@router.get("/{venda_id}", response_model=list[VendaItemResponse])
def listar_itens(
    venda_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(VendaItem).join(Venda).filter(
        VendaItem.venda_id == venda_id,
        Venda.empresa_id == user["empresa_id"]
    ).all()