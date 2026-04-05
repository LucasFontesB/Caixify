from datetime import datetime, timedelta
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.security import HTTPBearer
from jose import jwt, JWTError
from app.core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuarios import Usuario
from datetime import datetime, timedelta, timezone

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id    = payload.get("user_id")
        empresa_id = payload.get("empresa_id")
        tipo       = payload.get("tipo")

        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")

        # ← verifica se o usuário ainda está ativo no banco
        usuario = db.query(Usuario).filter(Usuario.id == user_id).first()

        if not usuario or not usuario.ativo:
            raise HTTPException(status_code=401, detail="Sessão inválida")

        return {
            "user_id":    user_id,
            "empresa_id": empresa_id,
            "tipo":       tipo
        }

    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

def criar_token(data: dict):

    dados = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    dados.update({"exp": expire})

    token = jwt.encode(dados, SECRET_KEY, algorithm=ALGORITHM)

    return token