"""Servicio de usuarios."""
from app.core.exceptions import NotFoundError
from app.models import Usuario, UsuarioRol, Rol
from app.repositories.usuario_repository import UsuarioRepository


class UsuarioService:
    def __init__(self, db):
        self.db = db
        self.repo = UsuarioRepository(db)

    def obtener_o_sincronizar(
        self,
        auth_user_id: str,
        email: str | None = None,
        metadata: dict | None = None,
    ) -> Usuario:
        # 1. Buscar por auth_user_id
        u = self.repo.get_by_auth_id(auth_user_id)
        if u:
            return u

        # 2. Si no se encontró por auth_user_id pero tenemos email (desincronización de UUID)
        if email:
            u = self.repo.get_by_email(email)
            if u:
                u.auth_user_id = auth_user_id
                self.db.commit()
                self.db.refresh(u)
                return u

            # 3. Si no existe en la tabla usuario pero el token de Supabase Auth es válido, auto-crear
            meta = metadata or {}
            nombre = meta.get("nombre") or email.split("@")[0]
            apellido = meta.get("apellido") or ""
            nuevo_usuario = Usuario(
                auth_user_id=auth_user_id,
                email=email,
                nombre=nombre,
                apellido=apellido,
                activo=True,
            )
            self.db.add(nuevo_usuario)
            self.db.commit()
            self.db.refresh(nuevo_usuario)

            # Asignar rol vendedor por defecto
            rol_vendedor = self.db.query(Rol).filter(Rol.nombre == "vendedor").first()
            if rol_vendedor:
                self.db.add(UsuarioRol(usuario_id=nuevo_usuario.id, rol_id=rol_vendedor.id))
                self.db.commit()

            return nuevo_usuario

        raise NotFoundError("Usuario no encontrado en el sistema")

    def obtener_por_auth_id(self, auth_user_id: str) -> Usuario:
        return self.obtener_o_sincronizar(auth_user_id)

    def listar_con_roles(self, skip: int = 0, limit: int = 100) -> list[dict]:
        from app.repositories.vendedor_lista_repository import VendedorListaRepository
        vendedor_repo = VendedorListaRepository(self.db)
        usuarios = self.repo.get_all(skip, limit)
        if not usuarios:
            return []
        ids = [u.id for u in usuarios]
        roles_map = self.repo.get_roles_bulk(ids)
        listas_map = vendedor_repo.get_listas_by_usuarios_bulk(ids)
        result = []
        for u in usuarios:
            roles = roles_map.get(u.id, [])
            listas = listas_map.get(u.id, []) if "vendedor" in roles else []
            result.append({
                "id": u.id,
                "email": u.email,
                "nombre": u.nombre,
                "apellido": u.apellido,
                "activo": u.activo,
                "roles": roles,
                "listas_precio": listas,
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

    def set_roles(self, usuario_id: int, rol_ids: list[int]) -> None:
        """Reemplaza todos los roles del usuario."""
        self.db.query(UsuarioRol).filter(UsuarioRol.usuario_id == usuario_id).delete()
        for rid in rol_ids:
            self.db.add(UsuarioRol(usuario_id=usuario_id, rol_id=rid))
        self.db.commit()
