from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime


class VendaCreate(BaseModel):
    total:           Decimal
    desconto:        Decimal = 0
    forma_pagamento: str | None = None
    turno_id:        int | None = None


class VendaResponse(BaseModel):
    id: int
    total: Decimal
    desconto: Decimal
    forma_pagamento: str | None
    data_venda: datetime

    class Config:
        from_attributes = True