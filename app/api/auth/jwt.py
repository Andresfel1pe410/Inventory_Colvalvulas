"""
Autenticación JWT compatible con Supabase.
Soporta JWKS (RS256, ES256) y JWT Secret (HS256) como fallback.
"""
import logging
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Security, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models import Usuario
from app.services.usuario_service import UsuarioService

logger = logging.getLogger(__name__)
settings = get_settings()
security = HTTPBearer(auto_error=False)

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        jwks_uri = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_uri, cache_jwk_set=True, lifespan=3600, timeout=10)
    return _jwks_client


def precargar_jwks() -> None:
    """Descarga las llaves públicas de Supabase al arrancar, para que la
    primera petición de un usuario no pague esa descarga. Si falla (sin red,
    proyecto con HS256), no detiene el arranque: se reintenta en la primera
    validación."""
    try:
        _get_jwks_client().get_jwk_set()
    except Exception as e:  # noqa: BLE001 - solo es un precalentamiento
        logger.info("No se pudo precargar JWKS (se cargará bajo demanda): %s", e)


def verify_token(token: str) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token vacío",
        )

    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
    except Exception as e:
        logger.warning("No se pudo leer header JWT: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    try:
        # leeway=60: tolera desfase de reloj entre servidor y Supabase.
        # verify_iat=False: evita rechazos por iat ligeramente adelantado cuando hay skew.
        decode_opts = {"verify_exp": True, "verify_iat": False}
        if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options=decode_opts,
                leeway=60,
            )
        if alg in ("RS256", "ES256"):
            signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                options=decode_opts,
                leeway=60,
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError as e:
        err_msg = str(e)
        logger.warning("JWT inválido: %s (%s)", type(e).__name__, err_msg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {err_msg}",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Algoritmo {alg} no soportado. Se soportan HS256, RS256 y ES256.",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
    db: Session = Depends(get_db),
) -> Usuario:
    """Dependencia de autenticación.

    Es `def` (no `async def`) a propósito: hace I/O bloqueante (consulta a la
    BD con SQLAlchemy síncrono y, la primera vez, descarga del JWKS). FastAPI
    ejecuta las dependencias `def` en el threadpool; si fuera `async def`,
    ese I/O correría en el event loop y frenaría TODAS las peticiones del
    worker mientras espera a la base de datos."""
    if credentials is None:
        logger.warning("401: No se proporcionó token (Authorization header vacío)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporcionó token de autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        payload = verify_token(token)
    except HTTPException as he:
        logger.warning("401: Verificación JWT falló: %s", he.detail)
        raise

    auth_user_id = payload.get("sub")
    if not auth_user_id:
        logger.warning("401: Token sin 'sub' en payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido: falta sub",
        )

    email = payload.get("email")
    user_metadata = payload.get("user_metadata") or {}

    usuario_service = UsuarioService(db)
    try:
        usuario = usuario_service.obtener_o_sincronizar(auth_user_id, email=email, metadata=user_metadata)
    except Exception as e:
        logger.warning("401: Usuario no encontrado en BD: auth_user_id=%s, email=%s, error=%s", auth_user_id, email, e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado en la base de datos. Ejecute el SQL en MIGRACION_USUARIO.md para crearlo.",
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario desactivado",
        )

    return usuario


def get_current_roles(usuario: Usuario = Depends(get_current_user)) -> list[str]:
    """Nombres de rol del usuario autenticado.

    FastAPI cachea las dependencias por request, así que todas las
    verificaciones de permisos de una misma petición comparten este resultado.
    En producción los roles ya vienen cargados por el JOIN de
    `UsuarioRepository.get_by_auth_id` (no hay consulta extra)."""
    return [ur.rol.nombre for ur in usuario.roles if ur.rol is not None]
