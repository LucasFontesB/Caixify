from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.core.auth import get_current_user
from app.core.security import hash_senha, require_admin
from app.database import get_db
from app.models.usuarios import Usuario
from app.schemas.usuario_schema import UsuarioCreate, UsuarioResponse, UsuarioUpdate, SenhaUpdate
from pydantic import BaseModel

router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"]
)


# ── Listar usuários da empresa ────────────────────────────────────────────────
@router.get("/", response_model=list[UsuarioResponse])
def listar_usuarios(
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    return db.query(Usuario).filter(
        Usuario.empresa_id == user["empresa_id"]
    ).all()


# ── Criar usuário ─────────────────────────────────────────────────────────────
@router.post("/", response_model=UsuarioResponse)
def criar_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    # Verificação global — login único em todo o sistema
    login_existe = db.query(Usuario).filter(
        Usuario.login == usuario.login
    ).first()

    if login_existe:
        raise HTTPException(status_code=400, detail="Este login já está em uso no sistema")

    novo_usuario = Usuario(
        empresa_id=user["empresa_id"],
        nome=usuario.nome,
        login=usuario.login,
        senha_hash=hash_senha(usuario.senha),
        tipo=usuario.tipo
    )

    try:
        db.add(novo_usuario)
        db.commit()
        db.refresh(novo_usuario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este login já está em uso no sistema")

    return novo_usuario


# ── Editar usuário ────────────────────────────────────────────────────────────
@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == user["empresa_id"]
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Verificação global — login único em todo o sistema
    if dados.login and dados.login != usuario.login:
        login_existe = db.query(Usuario).filter(
            Usuario.login == dados.login
        ).first()
        if login_existe:
            raise HTTPException(status_code=400, detail="Este login já está em uso no sistema")

    try:
        for campo, valor in dados.model_dump(exclude_unset=True).items():
            setattr(usuario, campo, valor)

        db.commit()
        db.refresh(usuario)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Este login já está em uso no sistema")

    return usuario


# ── Redefinir senha ───────────────────────────────────────────────────────────
@router.patch("/{usuario_id}/senha")
def redefinir_senha(
    usuario_id: int,
    dados: SenhaUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    if len(dados.senha) < 4:
        raise HTTPException(status_code=400, detail="Senha muito curta (mínimo 4 caracteres)")

    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == user["empresa_id"]
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario.senha_hash = hash_senha(dados.senha)

    db.commit()

    return {"mensagem": "Senha redefinida com sucesso"}


# ── Desativar usuário ─────────────────────────────────────────────────────────
@router.delete("/{usuario_id}")
def desativar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    # Impede que o admin desative a si mesmo
    if usuario_id == user["user_id"]:
        raise HTTPException(status_code=400, detail="Você não pode desativar sua própria conta")

    usuario = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.empresa_id == user["empresa_id"]
    ).first()

    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    usuario.ativo = False

    db.commit()

    return {"mensagem": "Usuário desativado"}