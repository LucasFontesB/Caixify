from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from enum import Enum

class TipoMovimentacao(str, Enum):
    entrada = "entrada"
    saida = "saida"

class CaixaCreate(BaseModel):
    tipo: str  # entrada / saida
    valor: Decimal
    forma_pagamento: str | None = None
    descricao: str | None = None


class CaixaResponse(BaseModel):
    id: int
    tipo: str
    valor: Decimal
    forma_pagamento: str | None
    descricao: str | None
    data_movimentacao: datetime

    class Config:
        from_attributes = True