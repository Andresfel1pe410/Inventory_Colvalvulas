"""Servicio de usuarios."""
from app.core.exceptions import NotFoundError
from app.models import Usuario, UsuarioRol, Rol
from app.repositories.usuario_repository import UsuarioRepository


class UsuarioService:
    def __init__(self, db):
        self.db = db
        self.repo = UsuarioRepository(db)

    def obtener_por_auth_id(self, auth_user_id: str) -> Usuario:
        u = self.repo.get_by_auth_id(auth_user_id)
        if not u:
            raise NotFoundError("Usuario no encontrado en el sistema")
        return u

    def listar_con_roles(self, skip: int = 0, limit: int = 100) -> list[dict]:
        usuarios = self.repo.get_all(skip, limit)
        result = []
        for u in usuarios:
            roles = self.repo.get_roles(u.id)
            result.append({
                "id": u.id,
                "email": u.email,
                "nombre": u.nombre,
                "apellido": u.apellido,
                "activo": u.activo,
                "roles": roles,
            })
        return result

    def asignar_rol(self, usuario_id: int, rol_id: int) -> UsuarioRol:
        existing = (
            self.db.query(UsuarioRol)
            .filter(UsuarioRol.usuario_id == usuario_id, UsuarioRol.rol_id == rol_id)
            .first()
        )
        if existing:
            return existing
        ur = UsuarioRol(usuario_id=usuario_id, rol_id=rol_id)
        self.db.add(ur)
        self.db.commit()
        self.db.refresh(ur)
        return ur
