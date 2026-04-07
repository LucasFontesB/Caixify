from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from app.core.auth import get_current_user

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_senha(senha: str):
    return pwd_context.hash(senha)

def verificar_senha(senha, senha_hash):
    return pwd_context.verify(senha, senha_hash)

def require_admin(user=Depends(get_current_user)):
    if user["tipo"] != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user

def require_superadmin(user=Depends(get_current_user)):
    if user["tipo"] != "superadmin":
        raise HTTPException(status_code=403, detail="Apenas superadmins podem criar empresas")
    return user

DUMMY_HASH = pwd_context.hash("dummy_constant_para_timing_attack")