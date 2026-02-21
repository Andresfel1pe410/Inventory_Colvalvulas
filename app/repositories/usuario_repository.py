"""Repositorio de usuarios."""
from app.repositories.base_repository import BaseRepository
from app.models import Usuario, Rol, UsuarioRol


class UsuarioRepository(BaseRepository[Usuario]):
    def __init__(self, db):
        super().__init__(Usuario, db)

    def get_by_auth_id(self, auth_user_id: str) -> Usuario | None:
        return (
            self.db.query(Usuario)
            .filter(Usuario.auth_user_id == auth_user_id)
            .first()
        )

    def get_roles(self, usuario_id: int) -> list[str]:
        roles = (
            self.db.query(Rol)
            .join(UsuarioRol)
            .filter(UsuarioRol.usuario_id == usuario_id)
            .all()
        )
        return [r.nombre for r in roles]
