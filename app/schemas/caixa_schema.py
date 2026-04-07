from pydantic import BaseModel, Field
from decimal import Decimal
from datetime import datetime
from enum import Enum
from typing import Optional

class TipoMovimentacao(str, Enum):
    entrada = "entrada"
    saida   = "saida"

class FormaPagamentoResumo(BaseModel):
    forma:      str
    quantidade: int
    total:      float

class ResumoDiaResponse(BaseModel):
    data:                str
    faturamento:         float
    descontos:           float
    lucro_bruto:         float
    despesas:            float
    lucro_liquido:       float
    num_vendas:          int
    por_forma_pagamento: list[FormaPagamentoResumo]

class HistoricoItem(BaseModel):
    id:        str
    origem:    str
    tipo:      str
    valor:     float
    forma:     Optional[str]
    descricao: Optional[str]
    categoria: Optional[str]
    data:      str

class TotaisRelatorio(BaseModel):
    faturamento:   float
    lucro_bruto:   float
    despesas:      float
    lucro_liquido: float
    num_vendas:    int

class DiaRelatorio(BaseModel):
    dia:           str
    num_vendas:    int
    faturamento:   float
    descontos:     float
    lucro_bruto:   float
    despesas:      float
    lucro_liquido: float

class RelatorioPeriodoResponse(BaseModel):
    data_inicio: str
    data_fim:    str
    totais:      TotaisRelatorio
    por_dia:     list[DiaRelatorio]

class CaixaCreate(BaseModel):
    tipo: TipoMovimentacao
    valor: Decimal = Field(..., gt=0, le=999999.99)
    forma_pagamento: str | None = Field(default=None, max_length=30)
    descricao:       str | None = Field(default=None, max_length=255)

class AbrirCaixaRequest(BaseModel):
    saldo_inicial: Decimal = Field(Decimal("0"), ge=0, le=999999.99)

class FecharCaixaRequest(BaseModel):
    saldo_final: Decimal = Field(Decimal("0"), ge=0, le=999999.99)

class CaixaResponse(BaseModel):
    id:                int
    tipo:              str
    valor:             Decimal
    forma_pagamento:   str | None
    descricao:         str | None
    data_movimentacao: datetime

    class Config:
        from_attributes = True