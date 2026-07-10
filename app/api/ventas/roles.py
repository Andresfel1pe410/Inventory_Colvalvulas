"""Router de roles."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario, Rol

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("")
def listar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return db.query(Rol).all()
