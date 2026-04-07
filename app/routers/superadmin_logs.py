from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.superadmin import SuperadminLog, Superadmin
from app.models.empresa import Empresa
from app.core.superadmin_auth import get_superadmin_atual

router = APIRouter(prefix="/superadmin", tags=["superadmin-logs"])


@router.get("/logs")
def listar_logs(
    empresa_id: int | None = None,
    acao: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    superadmin: Superadmin = Depends(get_superadmin_atual),
):
    q = db.query(
        SuperadminLog,
        Empresa.nome.label("empresa_nome"),
        Superadmin.nome.label("superadmin_nome"),
    ).outerjoin(
        Empresa, Empresa.id == SuperadminLog.empresa_id
    ).join(
        Superadmin, Superadmin.id == SuperadminLog.superadmin_id
    )

    if empresa_id:
        q = q.filter(SuperadminLog.empresa_id == empresa_id)
    if acao:
        q = q.filter(SuperadminLog.acao == acao)

    total = q.count()
    logs = q.order_by(SuperadminLog.data.desc()).offset(offset).limit(limit).all()

    return {
        "total": total,
        "items": [
            {
                "id": l.SuperadminLog.id,
                "acao": l.SuperadminLog.acao,
                "empresa_id": l.SuperadminLog.empresa_id,
                "empresa_nome": l.empresa_nome,
                "superadmin_nome": l.superadmin_nome,
                "snapshot": l.SuperadminLog.snapshot,
                "ip": l.SuperadminLog.ip,
                "data": l.SuperadminLog.data,
            }
            for l in logs
        ],
    }