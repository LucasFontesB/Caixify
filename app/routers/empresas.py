from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.security import require_admin
from app.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa_schema import EmpresaCreate, EmpresaResponse, EmpresaUpdate

router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"]
)

# Criar empresa
@router.post("/", response_model=EmpresaResponse)
def criar_empresa(
    empresa: EmpresaCreate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    nova_empresa = Empresa(**empresa.dict())

    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)

    return nova_empresa

# Listar empresas
@router.get("/", response_model=list[EmpresaResponse])
def listar_empresas(
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    return db.query(Empresa).filter(
        Empresa.id == user["empresa_id"]
    ).all()

# Buscar empresa por ID
@router.get("/{empresa_id}", response_model=EmpresaResponse)
def buscar_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.id == user["empresa_id"]
    ).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    return empresa

@router.put("/{empresa_id}", response_model=EmpresaResponse)
def atualizar_empresa(
    empresa_id: int,
    dados: EmpresaUpdate,
    db: Session = Depends(get_db),
    user=Depends(require_admin)
):
    empresa = db.query(Empresa).filter(
        Empresa.id == empresa_id,
        Empresa.id == user["empresa_id"]
    ).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(empresa, campo, valor)

    db.commit()
    db.refresh(empresa)

    return empresa