# app/schemas/estoque_schema.py
from decimal import Decimal
from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, condecimal, validator, model_validator
from pydantic import ConfigDict


class TipoMovimentacao(str, Enum):
    entrada = "entrada"
    saida   = "saida"
    ajuste  = "ajuste"


class MovimentacaoCreate(BaseModel):
    produto_id:          int
    tipo:                TipoMovimentacao
    quantidade:          condecimal(ge=Decimal("0"), max_digits=10, decimal_places=3)
    referencia:          Optional[str]              = None
    valor_unitario:      Optional[condecimal(
                             ge=Decimal("0"),
                             le=Decimal("9999999.99"),
                             max_digits=10,
                             decimal_places=2
                         )]                         = None
    registrar_despesa:   bool = False
    registrar_receita:   bool = False

    model_config = ConfigDict(extra="forbid")

    @validator("quantidade")
    def validar_quantidade(cls, v, values):
        tipo = values.get("tipo")
        if tipo in (TipoMovimentacao.entrada, TipoMovimentacao.saida) and v <= 0:
            raise ValueError("Quantidade deve ser maior que zero para entrada/saída")
        if tipo == TipoMovimentacao.ajuste and v < 0:
            raise ValueError("Quantidade não pode ser negativa em ajuste")
        return v

    @model_validator(mode="after")
    def validar_campos_cruzados(self):
        if self.registrar_despesa and not self.valor_unitario:
            raise ValueError(
                "valor_unitario é obrigatório quando registrar_despesa=True"
            )
        if self.registrar_receita and self.tipo != TipoMovimentacao.saida:
            raise ValueError(
                "registrar_receita só é válido para movimentações do tipo 'saida'"
            )
        if self.registrar_despesa and self.tipo != TipoMovimentacao.entrada:
            raise ValueError(
                "registrar_despesa só é válido para movimentações do tipo 'entrada'"
            )
        return self


class MovimentacaoResponse(BaseModel):
    id:         int
    produto_id: int
    tipo:       str
    quantidade: float
    referencia: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class MovimentacaoListResponse(BaseModel):
    id:           int
    produto_id:   int
    produto_nome: str
    tipo:         str
    quantidade:   float
    referencia:   Optional[str]
    created_at:   datetime

    model_config = ConfigDict(from_attributes=True)