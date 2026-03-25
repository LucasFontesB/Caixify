from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database import get_db
from app.models.produto import Produto
from app.models.estoque import EstoqueMovimentacao
from app.schemas.estoque_schema import MovimentacaoCreate, MovimentacaoResponse
from app.core.auth import get_current_user

router = APIRouter(prefix="/estoque", tags=["Estoque"])


@router.post("/movimentar", response_model=MovimentacaoResponse)
def movimentar_estoque(
    dados: MovimentacaoCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    produto = db.query(Produto).filter(
        Produto.id == dados.produto_id,
        Produto.empresa_id == user["empresa_id"]
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    # 🔥 Regras de negócio
    if dados.tipo == "entrada":
        produto.estoque += dados.quantidade

    elif dados.tipo == "saida":
        if produto.estoque < dados.quantidade:
            raise HTTPException(status_code=400, detail="Estoque insuficiente")
        produto.estoque -= dados.quantidade

    elif dados.tipo == "ajuste":
        produto.estoque = dados.quantidade

    else:
        raise HTTPException(status_code=400, detail="Tipo inválido")

    movimentacao = EstoqueMovimentacao(
        empresa_id=user["empresa_id"],
        produto_id=produto.id,
        tipo=dados.tipo,
        quantidade=dados.quantidade,
        referencia=dados.referencia
    )

    db.add(movimentacao)
    db.commit()
    db.refresh(movimentacao)

    return movimentacao