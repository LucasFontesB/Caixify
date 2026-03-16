from jose import jwt
from datetime import datetime, timedelta

from app.core.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES
)


def criar_token(data: dict):

    dados = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    dados.update({"exp": expire})

    token = jwt.encode(dados, SECRET_KEY, algorithm=ALGORITHM)

    return token