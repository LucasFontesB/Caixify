from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
import logging
from app.database import get_db
from app.models.empresa import Empresa
from app.models.usuarios import Usuario
from app.schemas.auth_schema import LoginRequest, LoginResponse, MeResponse, UsuarioResponse
from app.core.security import verificar_senha, DUMMY_HASH
from app.core.auth import criar_token, get_current_user
from app.core.rate_limit import checar_bloqueio, registrar_falha, limpar_falhas
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
audit_log = logging.getLogger("audit")

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
def login(request: Request, response: Response, dados: LoginRequest, db: Session = Depends(get_db)):

    # Bloqueio por conta antes de qualquer query
    checar_bloqueio(dados.login)

    usuario = db.query(Usuario).filter(Usuario.login == dados.login).first()

    # SEMPRE roda bcrypt — evita timing attack
    hash_alvo = usuario.senha_hash if usuario else DUMMY_HASH
    senha_ok = verificar_senha(dados.senha, hash_alvo)

    empresa = db.query(Empresa).filter(
        Empresa.id == usuario.empresa_id
    ).first() if usuario else None

    # Validação unificada — não vaza qual campo falhou
    if not usuario or not senha_ok or not usuario.ativo or not empresa or not empresa.ativo:
        registrar_falha(dados.login)
        audit_log.warning("LOGIN_FAIL ip=%s login=%s", getattr(request.client, "host", "unknown"), dados.login[:50])
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    limpar_falhas(dados.login)
    audit_log.info("LOGIN_OK ip=%s user_id=%s empresa_id=%s", getattr(request.client, "host", "unknown"), usuario.id, usuario.empresa_id)

    token = criar_token({
        "user_id":    usuario.id,
        "empresa_id": usuario.empresa_id,
        "tipo":       usuario.tipo
    })

    response.headers["Cache-Control"] = "no-store, no-cache"
    response.headers["X-Content-Type-Options"] = "nosniff"

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        usuario=UsuarioResponse(
            id=usuario.id,
            nome=usuario.nome,
            login=usuario.login,
            tipo=usuario.tipo,
            empresa_id=usuario.empresa_id,
            empresa_nome=empresa.nome,
            empresa_logo=empresa.logo_url,
        )
    )


@router.get("/me", response_model=MeResponse)
def me(user=Depends(get_current_user), db: Session = Depends(get_db)):

    # Dados sempre frescos do banco — não confia só no token
    usuario_db = db.query(Usuario).filter(
        Usuario.id == user["user_id"],
        Usuario.empresa_id == user["empresa_id"],
        Usuario.ativo == True
    ).first()

    if not usuario_db:
        raise HTTPException(status_code=401, detail="Sessão inválida")

    empresa = db.query(Empresa).filter(
        Empresa.id == usuario_db.empresa_id,
        Empresa.ativo == True
    ).first()

    if not empresa:
        raise HTTPException(status_code=403, detail="Acesso não autorizado")

    return MeResponse(
        user_id=usuario_db.id,
        empresa_id=usuario_db.empresa_id,
        tipo=usuario_db.tipo,
        empresa_nome=empresa.nome,
        empresa_logo=empresa.logo_url,
    )