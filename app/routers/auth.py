from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.usuarios import Usuario
from app.schemas.auth_schema import LoginRequest

from app.core.security import verificar_senha
from app.core.auth import criar_token


router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/login")
def login(dados: LoginRequest, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.login == dados.login).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Login inválido")

    if not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="Senha inválida")

    token = criar_token({
        "user_id": usuario.id,
        "empresa_id": usuario.empresa_id
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }