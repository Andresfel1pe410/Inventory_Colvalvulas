"""Servicio para darle acceso de login (Supabase Auth) a un empleado ya
existente en RRHH. Separado de EmpleadoService: toca un dominio distinto
(auth/usuario), y es la primera vez que el backend usa la Admin API de
Supabase (SUPABASE_SERVICE_ROLE_KEY)."""
import time

from app.core.exceptions import AppException, NotFoundError, ValidationError
from app.core.supabase_admin import crear_usuario_auth
from app.models import Rol, UsuarioRol
from app.repositories.empleado_repository import EmpleadoRepository
from app.repositories.usuario_repository import UsuarioRepository

REINTENTOS_BUSQUEDA_USUARIO = 3
ESPERA_ENTRE_REINTENTOS_SEG = 0.3


class EmpleadoAccesoService:
    def __init__(self, db):
        self.db = db
        self.emp_repo = EmpleadoRepository(db)
        self.usuario_repo = UsuarioRepository(db)

    def obtener_estado(self, empleado_id: int) -> dict:
        if not self.emp_repo.get(empleado_id):
            raise NotFoundError("Empleado no encontrado")
        usuario = self.usuario_repo.get_by_empleado_id(empleado_id)
        return {"tiene_acceso": usuario is not None, "email": usuario.email if usuario else None}

    def crear_acceso(self, empleado_id: int, email: str, password: str) -> dict:
        empleado = self.emp_repo.get(empleado_id)
        if not empleado or not empleado.activo:
            raise NotFoundError("Empleado no encontrado o inactivo")
        if self.usuario_repo.get_by_empleado_id(empleado_id):
            raise ValidationError("Este empleado ya tiene acceso")
        if not email or not email.strip():
            raise ValidationError("El correo es obligatorio")
        if len(password) < 6:
            raise ValidationError("La contraseña debe tener al menos 6 caracteres")

        auth_data = crear_usuario_auth(email.strip().lower(), password)
        auth_user_id = auth_data["id"]

        # El trigger 002_sync_usuario_on_signup.sql crea la fila `usuario`
        # (con rol 'vendedor' por defecto) dentro de la misma transacción
        # que Supabase confirma antes de responder -- este reintento corto
        # es solo una red de seguridad ante latencia inesperada.
        usuario = None
        for _ in range(REINTENTOS_BUSQUEDA_USUARIO):
            usuario = self.usuario_repo.get_by_auth_id(auth_user_id)
            if usuario:
                break
            time.sleep(ESPERA_ENTRE_REINTENTOS_SEG)
        if not usuario:
            raise AppException(
                "El usuario se creó en Supabase Auth pero no apareció en la base de datos. "
                "Verifica que la migración 031_usuario_empleado_acceso.sql esté aplicada.",
                status_code=500,
            )

        rol_empleado = self.db.query(Rol).filter_by(nombre="empleado").first()
        if not rol_empleado:
            raise AppException(
                "Falta el rol 'empleado'. Aplica la migración 031_usuario_empleado_acceso.sql.",
                status_code=500,
            )

        # Corrige el rol autoasignado por el trigger (vendedor) -> empleado,
        # y vincula el usuario con el empleado. Todo en un solo commit.
        self.db.query(UsuarioRol).filter(UsuarioRol.usuario_id == usuario.id).delete()
        self.db.add(UsuarioRol(usuario_id=usuario.id, rol_id=rol_empleado.id))
        usuario.empleado_id = empleado.id
        self.db.commit()
        self.db.refresh(usuario)

        return {"tiene_acceso": True, "email": usuario.email}
