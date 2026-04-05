from urllib.request import Request

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.models.empresa import Empresa
from app.models.usuarios import Usuario
from app.schemas.auth_schema import LoginRequest

from app.core.security import verificar_senha
from app.core.auth import criar_token, get_current_user
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)

@router.post("/login")
@limiter.limit("5/minute")
def login(request: Request, dados: LoginRequest, db: Session = Depends(get_db)):

    usuario = db.query(Usuario).filter(Usuario.login == dados.login).first()
    senha_ok = verificar_senha(dados.senha, usuario.senha_hash) if usuario else False

    if not usuario or not senha_ok:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    if not usuario.ativo:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # ← busca empresa ANTES de verificar
    empresa = db.query(Empresa).filter(Empresa.id == usuario.empresa_id).first()

    if not empresa or not empresa.ativo:
        raise HTTPException(status_code=403, detail="Empresa inativa")

    token = criar_token({
        "user_id":    usuario.id,
        "empresa_id": usuario.empresa_id,
        "tipo":       usuario.tipo
    })

    return {
        "access_token": token,
        "token_type":   "bearer",
        "usuario": {
            "id":           usuario.id,
            "nome":         usuario.nome,
            "login":        usuario.login,
            "tipo":         usuario.tipo,
            "empresa_id":   usuario.empresa_id,
            "empresa_nome": empresa.nome,
            "empresa_logo": empresa.logo_url,
        }
    }

@router.get("/me")
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):
    empresa = db.query(Empresa).filter(Empresa.id == user["empresa_id"]).first()

    return {
        "user_id": user["user_id"],
        "empresa_id": user["empresa_id"],
        "tipo": user["tipo"],
        "empresa_nome": empresa.nome if empresa else None,
        "empresa_logo": empresa.logo_url if empresa else None,
    }