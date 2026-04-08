from pydantic import BaseModel
from datetime import datetime


class UsuarioCreate(BaseModel):
    nome: str
    login: str
    senha: str
    tipo: str | None = "operador"


class UsuarioResponse(BaseModel):
    id: int
    empresa_id: int
    nome: str
    login: str
    tipo: str
    ativo: bool
    data_criacao: datetime

    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nome: str | None = None
    login: str | None = None
    tipo: str | None = None
    ativo: bool | None = None

class SenhaUpdate(BaseModel):
    senha: str