import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL não definida nas variáveis de ambiente!")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY não definida nas variáveis de ambiente!")

ALGORITHM = os.getenv("ALGORITHM")
if not ALGORITHM:
    raise RuntimeError("ALGORITHM não definida nas variáveis de ambiente!")

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))
if not ACCESS_TOKEN_EXPIRE_MINUTES:
    raise RuntimeError("ACCESS_TOKEN_EXPIRE_MINUTES não definida nas variáveis de ambiente!")