"""
Endpoint de diagnóstico de autenticación (solo para desarrollo).
Ayuda a identificar por qué falla el 401.
"""
import logging
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.database import get_db
from app.api.auth import verify_token
from app.services.usuario_service import UsuarioService
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["debug"])
security = HTTPBearer(auto_error=False)


@router.get("/debug/auth")
def debug_auth(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
):
    """
    Diagnóstico de auth: indica exactamente dónde falla.
    No requiere autenticación. Envía el token si lo tienes.
    """
    auth_header = request.headers.get("Authorization")
    result = {
        "auth_header_present": auth_header is not None,
        "bearer_present": auth_header and auth_header.startswith("Bearer "),
        "step": None,
        "error": None,
        "auth_user_id": None,
        "usuario_in_db": None,
    }

    if not credentials:
        result["step"] = "no_token"
        result["error"] = "No se envió Authorization: Bearer <token>"
        return result

    token = credentials.credentials
    if not token:
        result["step"] = "empty_token"
        result["error"] = "Token vacío"
        return result

    try:
        payload = verify_token(token)
        auth_user_id = payload.get("sub")
        result["auth_user_id"] = auth_user_id
    except HTTPException as he:
        result["step"] = "token_invalid"
        result["error"] = he.detail
        return result
    except Exception as e:
        result["step"] = "token_invalid"
        result["error"] = str(e)
        return result

    if not auth_user_id:
        result["step"] = "no_sub"
        result["error"] = "Token sin 'sub' (id de usuario)"
        return result

    try:
        usuario_service = UsuarioService(db)
        usuario = usuario_service.obtener_por_auth_id(auth_user_id)
        result["step"] = "ok"
        result["usuario_in_db"] = True
        result["usuario_id"] = usuario.id
        result["email"] = usuario.email
    except Exception as e:
        result["step"] = "usuario_not_found"
        result["error"] = f"Usuario no existe en tabla usuario: {e}"
        result["usuario_in_db"] = False
        result["hint"] = "Ejecuta el SQL de MIGRACION_USUARIO.md en Supabase"

    return result
