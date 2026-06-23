"""Router de roles."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.models import Usuario, Rol
from app.repositories.usuario_repository import UsuarioRepository

router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("")
def listar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    roles = UsuarioRepository(db).get_roles(current_user.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder")
    return db.query(Rol).all()
