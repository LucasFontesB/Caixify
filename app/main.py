from fastapi import FastAPI
from app.routers import empresas
from app.routers import auth
from app.routers import usuarios

app = FastAPI(title="PDV SaaS")

app.include_router(empresas.router)
app.include_router(auth.router)
app.include_router(usuarios.router)
