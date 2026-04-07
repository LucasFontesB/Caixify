from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────────────────

class SuperadminLogin(BaseModel):
    login: str
    senha: str


class SuperadminTokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Empresa (visão do superadmin) ─────────────────────────────────────────────

class EmpresaCreate(BaseModel):
    nome: str
    cnpj: Optional[str] = None
    contato: Optional[str] = None
    plano: str = "basico"
    # Dados do primeiro admin
    admin_nome: str
    admin_login: str
    admin_senha: str


class EmpresaStatusUpdate(BaseModel):
    ativo: bool
    motivo_bloqueio: Optional[str] = None  # inadimplencia / manual / trial_expirado


class EmpresaOut(BaseModel):
    id: int
    nome: str
    cnpj: Optional[str]
    contato: Optional[str]
    ativo: bool
    plano: str
    motivo_bloqueio: Optional[str]
    deleted_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Planos ────────────────────────────────────────────────────────────────────

class PlanoCreate(BaseModel):
    nome: str
    valor_base: int   # centavos
    descricao: Optional[str] = None


class PlanoOut(BaseModel):
    id: int
    nome: str
    valor_base: int
    descricao: Optional[str]
    ativo: bool

    class Config:
        from_attributes = True


# ── Faturas ───────────────────────────────────────────────────────────────────

class FaturaCreate(BaseModel):
    empresa_id: int
    plano_id: Optional[int] = None
    valor: int          # centavos
    vencimento: datetime
    obs: Optional[str] = None


class FaturaPagar(BaseModel):
    obs: Optional[str] = None


class FaturaOut(BaseModel):
    id: int
    empresa_id: int
    plano_id: Optional[int]
    valor: int
    status: str
    vencimento: datetime
    pago_em: Optional[datetime]
    obs: Optional[str]
    created_at: datetime
    empresa_nome: Optional[str] = None

    class Config:
        from_attributes = True


# ── Logs ──────────────────────────────────────────────────────────────────────

class LogOut(BaseModel):
    id: int
    superadmin_id: int
    empresa_id: Optional[int]
    acao: str
    snapshot: Optional[Any]
    ip: Optional[str]
    data: datetime
    empresa_nome: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    total_empresas: int
    empresas_ativas: int
    empresas_bloqueadas: int
    empresas_novas_mes: int
    mrr: int                      # centavos — soma das mensalidades ativas
    receita_prevista_mes: int     # centavos
    receita_recebida_mes: int     # centavos
    faturas_vencidas: int
    faturas_vencendo_7dias: int