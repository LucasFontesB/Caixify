import redis
from app.core.config import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
)

redis_client = redis.Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True,
    socket_timeout=2,
    socket_connect_timeout=2,
)