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
        if alg == "HS256" and settings.SUPABASE_JWT_SECRET:
            return jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True},
            )
        if alg in ("RS256", "ES256"):
            global _jwks_client
            if _jwks_client is None:
                jwks_uri = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
                _jwks_client = PyJWKClient(jwks_uri, cache_jwk_set=True, lifespan=3600)
            signing_key = _jwks_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                options={"verify_exp": True},
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
        )
    except jwt.InvalidTokenError as e:
        logger.warning("JWT inválido: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Algoritmo {alg} no soportado. Se soportan HS256, RS256 y ES256.",
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Security(security),
    db: Session = Depends(get_db),
) -> Usuario:
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

    usuario_service = UsuarioService(db)
    try:
        usuario = usuario_service.obtener_por_auth_id(auth_user_id)
    except Exception as e:
        logger.warning("401: Usuario no encontrado en BD: auth_user_id=%s, error=%s", auth_user_id, e)
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
