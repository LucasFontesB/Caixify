from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.security import hash_senha, require_admin
from app.database import get_db
from app.models.usuarios import Usuario
from app.schemas.usuario_schema import UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)

@router.post("/", response_model=UsuarioResponse)
def criar_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    # 🔐 opcional: só admin pode criar
    if user.get("tipo") != "admin":
        raise HTTPException(status_code=403, detail="Sem permissão")

    novo_usuario = Usuario(
        empresa_id=user["empresa_id"],  # 🔥 pega do token, NÃO do input
        nome=usuario.nome,
        login=usuario.login,
        senha_hash=hash_senha(usuario.senha),
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
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == user["empresa_id"]  # 🔥 proteção
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(usuario, campo, valor)

    db.commit()
    db.refresh(usuario)

    return usuario

@router.delete("/{usuario_id}")
def desativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == user["empresa_id"]  # 🔥 proteção
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario.ativo = False

    db.commit()

    return {"mensagem": "Usuário desativado"}