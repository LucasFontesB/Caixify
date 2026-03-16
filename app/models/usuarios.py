from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Usuario(Base):

    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)

    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)

    nome = Column(String(120), nullable=False)

    login = Column(String(80), nullable=False)
    senha_hash = Column(String, nullable=False)

    tipo = Column(String(20), default="operador")

    ativo = Column(Boolean, default=True)

    data_criacao = Column(DateTime, server_default=func.now())