"""Dependencias de permisos compartidas entre routers."""
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository


def require_admin(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
) -> Usuario:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder")
    return usuario


def require_roles(*roles_permitidos: str):
    def _dep(
        db: Session = Depends(get_db),
        usuario: Usuario = Depends(get_current_user),
    ) -> Usuario:
        roles = UsuarioRepository(db).get_roles(usuario.id)
        if not any(r in roles for r in roles_permitidos):
            raise HTTPException(403, f"Requiere uno de estos roles: {', '.join(roles_permitidos)}")
        return usuario

    return _dep
