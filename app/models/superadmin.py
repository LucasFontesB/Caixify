from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Superadmin(Base):
    __tablename__ = "superadmins"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    login = Column(String, unique=True, nullable=False, index=True)
    senha = Column(String, nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)


class Plano(Base):
    __tablename__ = "planos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)          # basico / pro / enterprise
    valor_base = Column(Integer, nullable=False)   # em centavos
    descricao = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)


class Fatura(Base):
    __tablename__ = "faturas"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False, index=True)
    plano_id = Column(Integer, ForeignKey("planos.id"), nullable=True)
    valor = Column(Integer, nullable=False)        # em centavos
    # pendente / pago / vencido / cancelado
    status = Column(String, default="pendente", index=True)
    vencimento = Column(DateTime(timezone=True), nullable=False, index=True)
    pago_em = Column(DateTime(timezone=True), nullable=True)
    obs = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SuperadminLog(Base):
    __tablename__ = "superadmin_logs"

    id = Column(Integer, primary_key=True, index=True)
    superadmin_id = Column(Integer, ForeignKey("superadmins.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True, index=True)
    acao = Column(String, nullable=False)          # criar_empresa / bloquear / registrar_pagamento …
    snapshot = Column(JSON, nullable=True)         # {"antes": {...}, "depois": {...}}
    ip = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    data = Column(DateTime(timezone=True), server_default=func.now(), index=True)