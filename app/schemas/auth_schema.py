from pydantic import BaseModel, Field, field_validator, HttpUrl
from typing import Optional
from uuid import UUID

class LoginRequest(BaseModel):
    login: str = Field(..., min_length=3, max_length=100)
    senha: str = Field(..., min_length=3, max_length=128)

    @field_validator("login")
    @classmethod
    def sanitize_login(cls, v: str) -> str:
        return v.strip().lower()


class UsuarioResponse(BaseModel):
    id: int                    # era UUID
    nome: str
    login: str
    tipo: str
    empresa_id: int            # era UUID
    empresa_nome: str
    empresa_logo: Optional[str] = None  # era HttpUrl

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


class MeResponse(BaseModel):
    user_id: int               # era UUID
    empresa_id: int            # era UUID
    tipo: str
    empresa_nome: Optional[str] = None
    empresa_logo: Optional[str] = None