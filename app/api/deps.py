"""Dependencias de permisos compartidas entre routers.

Todas se apoyan en `get_current_roles`, que FastAPI resuelve una sola vez por
request: aunque un endpoint use varias verificaciones, los roles no se vuelven
a consultar en la base de datos.
"""
from fastapi import Depends, HTTPException

from app.api.auth.jwt import get_current_user, get_current_roles
from app.models import Usuario


def es_vendedor_solo(roles: list[str]) -> bool:
    """Vendedor sin rol admin: solo puede ver/editar sus propios pedidos y listas."""
    return "vendedor" in roles and "admin" not in roles


def require_admin(
    usuario: Usuario = Depends(get_current_user),
    roles: list[str] = Depends(get_current_roles),
) -> Usuario:
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder")
    return usuario


def require_roles(*roles_permitidos: str):
    def _dep(
        usuario: Usuario = Depends(get_current_user),
        roles: list[str] = Depends(get_current_roles),
    ) -> Usuario:
        if not any(r in roles for r in roles_permitidos):
            raise HTTPException(403, f"Requiere uno de estos roles: {', '.join(roles_permitidos)}")
        return usuario

    return _dep
