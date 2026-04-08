
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

MAX_TENTATIVAS = 5
BLOQUEIO_SEGUNDOS = 300

def checar_bloqueio(login: str):
    try:
        from app.core.redis import redis_client
        chave = f"login_fail:{login}"
        tentativas = int(redis_client.get(chave) or 0)
        if tentativas >= MAX_TENTATIVAS:
            raise HTTPException(
                status_code=429,
                detail="Conta temporariamente bloqueada. Tente novamente em 5 minutos."
            )
    except HTTPException:
        raise
    except Exception:
        logger.warning("Redis indisponível — bloqueio por conta desativado temporariamente")

def registrar_falha(login: str):
    try:
        from app.core.redis import redis_client
        chave = f"login_fail:{login}"
        redis_client.incr(chave)
        redis_client.expire(chave, BLOQUEIO_SEGUNDOS)
    except Exception:
        logger.warning("Redis indisponível — falha não registrada para login=%s", login[:50])

def limpar_falhas(login: str):
    try:
        from app.core.redis import redis_client
        redis_client.delete(f"login_fail:{login}")
    except Exception:
        pass