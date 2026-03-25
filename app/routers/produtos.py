from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.database import get_db
from app.models.produto import Produto
from app.schemas.produto_schema import ProdutoCreate, ProdutoResponse, ProdutoUpdate
from app.core.auth import get_current_user

router = APIRouter(prefix="/produtos", tags=["Produtos"])


# 🟢 Criar produto
@router.post("/", response_model=ProdutoResponse)
def criar_produto(
    dados: ProdutoCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    produto = Produto(
        empresa_id=user["empresa_id"],  # 🔥 ESSENCIAL
        codigo_barras=dados.codigo_barras,
        nome=dados.nome,
        preco_venda=dados.preco_venda,
        preco_custo=dados.preco_custo,
        estoque=dados.estoque,
        estoque_minimo=dados.estoque_minimo
    )

    db.add(produto)
    db.commit()
    db.refresh(produto)

    return produto


# 🔵 Listar produtos (ISOLADO POR EMPRESA)
@router.get("/", response_model=list[ProdutoResponse])
def listar_produtos(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Produto).filter(
        Produto.empresa_id == user["empresa_id"],
        Produto.ativo == True
    ).all()

@router.get("/buscar/{codigo}")
def buscar_produto(codigo: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Produto).filter(
        Produto.codigo_barras == codigo,
        Produto.empresa_id == user["empresa_id"]
    ).first()

@router.put("/{produto_id}")
def atualizar_produto(
    produto_id: int,
    dados: ProdutoUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    produto = db.query(Produto).filter(
        Produto.id == produto_id,
        Produto.empresa_id == user["empresa_id"]
    ).first()

    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if dados.preco_venda and dados.preco_venda < 0:
        raise HTTPException(400, "Preço inválido")

    dados_dict = dados.dict(exclude_unset=True)

    for campo, valor in dados_dict.items():
        setattr(produto, campo, valor)

    db.commit()
    db.refresh(produto)

    return produto