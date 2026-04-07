from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.superadmin import Superadmin

# Chave e algoritmo SEPARADOS do JWT dos clientes
SUPERADMIN_SECRET_KEY = "TROQUE_POR_UMA_CHAVE_FORTE_E_UNICA_SUPERADMIN"
SUPERADMIN_ALGORITHM = "HS256"
SUPERADMIN_TOKEN_EXPIRE_HOURS = 8

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def verificar_senha(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def criar_token(superadmin_id: int, nome: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=SUPERADMIN_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(superadmin_id),
        "nome": nome,
        "role": "superadmin",
        "permissions": ["manage_companies", "billing", "audit"],
        "exp": expire,
    }
    return jwt.encode(payload, SUPERADMIN_SECRET_KEY, algorithm=SUPERADMIN_ALGORITHM)


def get_superadmin_atual(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Superadmin:
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SUPERADMIN_SECRET_KEY, algorithms=[SUPERADMIN_ALGORITHM])
        if payload.get("role") != "superadmin":
            raise credentials_exception
        superadmin_id: Optional[int] = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise credentials_exception

    superadmin = db.query(Superadmin).filter(
        Superadmin.id == superadmin_id,
        Superadmin.ativo == True,
    ).first()

    if not superadmin:
        raise credentials_exception

    return superadmin