from pydantic import BaseModel
from datetime import datetime


class EmpresaCreate(BaseModel):
    nome: str
    cnpj: str | None = None
    telefone: str | None = None
    endereco: str | None = None


class EmpresaResponse(BaseModel):
    id: int
    nome: str
    cnpj: str | None
    telefone: str | None
    endereco: str | None
    ativo: bool
    data_criacao: datetime

    class Config:
        from_attributes = True

class EmpresaUpdate(BaseModel):
    nome: str | None = None
    cnpj: str | None = None
    telefone: str | None = None
    endereco: str | None = None
