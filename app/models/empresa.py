from sqlalchemy import Column, Integer, String, Boolean, Text, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class Empresa(Base):

    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)

    nome = Column(String(150), nullable=False)
    cnpj = Column(String(20))
    telefone = Column(String(20))
    endereco = Column(Text)

    ativo = Column(Boolean, default=True)

    data_criacao = Column(TIMESTAMP, server_default=func.now())