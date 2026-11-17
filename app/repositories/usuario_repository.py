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

    def get_by_empleado_id(self, empleado_id: int) -> Usuario | None:
        return self.db.query(Usuario).filter(Usuario.empleado_id == empleado_id).first()

    def get_roles(self, usuario_id: int) -> list[str]:
        roles = (
            self.db.query(Rol)
            .join(UsuarioRol)
            .filter(UsuarioRol.usuario_id == usuario_id)
            .all()
        )
        return [r.nombre for r in roles]

    def get_roles_bulk(self, usuario_ids: list[int]) -> dict[int, list[str]]:
        """Roles de varios usuarios en una sola consulta. {usuario_id: [rol1, rol2]}."""
        if not usuario_ids:
            return {}
        rows = (
            self.db.query(UsuarioRol.usuario_id, Rol.nombre)
            .join(Rol, UsuarioRol.rol_id == Rol.id)
            .filter(UsuarioRol.usuario_id.in_(usuario_ids))
            .all()
        )
        result: dict[int, list[str]] = {uid: [] for uid in usuario_ids}
        for usuario_id, rol_nombre in rows:
            result[usuario_id].append(rol_nombre)
        return result
