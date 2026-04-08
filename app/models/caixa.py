from sqlalchemy import Column, Integer, Numeric, String, ForeignKey, Text, TIMESTAMP, func
from app.database import Base

class Caixa(Base):
    __tablename__ = "caixas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    status = Column(String(20), nullable=False, default="aberto")  # aberto / fechado
    data_abertura = Column(TIMESTAMP, server_default=func.now())
    data_fechamento = Column(TIMESTAMP, nullable=True)
    saldo_inicial = Column(Numeric(10, 2), default=0)
    saldo_final = Column(Numeric(10, 2), nullable=True)

class CaixaMovimentacao(Base):
    __tablename__ = "caixa_movimentacoes"

    id = Column(Integer, primary_key=True, index=True)

    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))

    tipo = Column(String(20), nullable=False)  # entrada / saida
    valor = Column(Numeric(10, 2), nullable=False)

    forma_pagamento = Column(String(30))
    descricao = Column(Text)

    data_movimentacao = Column(TIMESTAMP, server_default=func.now())