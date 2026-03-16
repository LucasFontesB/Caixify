from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.usuarios import Usuario
from app.schemas.usuario_schema import UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=UsuarioResponse)
def criar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):

    novo_usuario = Usuario(
        empresa_id=usuario.empresa_id,
        nome=usuario.nome,
        login=usuario.login,
        senha_hash=usuario.senha,  # depois vamos aplicar hash
        tipo=usuario.tipo
    )

    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    return novo_usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db)
):

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    dados_dict = dados.model_dump(exclude_unset=True)

    for campo, valor in dados_dict.items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)

    return usuario

@router.delete("/{usuario_id}")
def desativar_usuario(usuario_id: int, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario.ativo = False

    db.commit()

    return {"mensagem": "Usuário desativado"}