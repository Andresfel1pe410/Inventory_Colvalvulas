"""Router de autenticación - endpoint /me."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.vendedor_lista_repository import VendedorListaRepository


class MeResponse(BaseModel):
    id: int
    email: str
    nombre: str | None
    apellido: str | None
    roles: list[str]
    listas_precio: list[str] | None  # Solo para vendedor; None = admin (todas)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
def me(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Devuelve el usuario actual con roles y listas asignadas (si es vendedor)."""
    roles = UsuarioRepository(db).get_roles(current_user.id)
    listas_precio = None
    if "vendedor" in roles and "admin" not in roles:
        listas_precio = VendedorListaRepository(db).get_listas_by_usuario(current_user.id)

    return MeResponse(
        id=current_user.id,
        email=current_user.email,
        nombre=current_user.nombre,
        apellido=current_user.apellido,
        roles=roles,
        listas_precio=listas_precio,
    )
