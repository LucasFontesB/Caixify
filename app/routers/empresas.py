from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.auth import get_current_user
from app.core.security import require_admin, require_superadmin
from app.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa_schema import EmpresaCreate, EmpresaResponse, EmpresaUpdate
from fastapi import UploadFile, File
import magic
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

limiter = Limiter(key_func=get_remote_address)

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"]
)

# Criar empresa
@router.post("/", response_model=EmpresaResponse)
def criar_empresa(
    empresa: EmpresaCreate,
    db: Session = Depends(get_db),
    user=Depends(require_superadmin)
):
    nova_empresa = Empresa(
        nome=empresa.nome,
        cnpj=empresa.cnpj,
        email=empresa.email,
        telefone=empresa.telefone,
    )

    db.add(nova_empresa)
    try:
        db.commit()
        db.refresh(nova_empresa)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar dados")

    return nova_empresa

# Listar empresas
##@router.get("/", response_model=list[EmpresaResponse])
##def listar_empresas(
    ##db: Session = Depends(get_db),
   ## user=Depends(get_current_user)
##):
    ##return db.query(Empresa).filter(
   ##     Empresa.id == user["empresa_id"]
    ##).all()

@router.get("/me", response_model=EmpresaResponse)
def obter_minha_empresa(db: Session = Depends(get_db), user=Depends(get_current_user)):
    empresa = db.query(Empresa).filter(
        Empresa.id == user["empresa_id"]
    ).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return empresa

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
    # Garante explicitamente que o admin só altera sua própria empresa
    if empresa_id != user["empresa_id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    empresa = db.query(Empresa).filter(
        Empresa.id == user["empresa_id"]  # nunca da URL diretamente
    ).first()

    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    for campo, valor in dados.dict(exclude_unset=True).items():
        setattr(empresa, campo, valor)

    try:
        db.commit()
        db.refresh(empresa)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar dados")

    return empresa

@router.post("/upload-logo")
@limiter.limit("5/minute")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Validar tamanho
    contents = await file.read()

    # 1. Validações de conteúdo
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande")

    mime_type = magic.from_buffer(contents, mime=True)
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Tipo de arquivo não permitido")

    empresa_id = user["empresa_id"]

    # 2. Verificar empresa ANTES de salvar qualquer arquivo
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    # 3. Só agora salvar o arquivo
    ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
    ext = ext_map[mime_type]
    upload_dir = Path("storage/logos")
    upload_dir.mkdir(parents=True, exist_ok=True)

    for old_ext in ["jpg", "png", "webp"]:
        old_path = upload_dir / f"empresa_{empresa_id}.{old_ext}"
        if old_path.exists():
            old_path.unlink()

    caminho = upload_dir / f"empresa_{empresa_id}.{ext}"

    with open(caminho, "wb") as buffer:
        buffer.write(contents)

    url = f"/uploads/empresas/empresa_{empresa_id}.{ext}"

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao salvar logo")

    return {"logo_url": url}