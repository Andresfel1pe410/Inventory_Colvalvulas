"""Llamadas a la Admin API de Supabase Auth. Usa SUPABASE_SERVICE_ROLE_KEY
(clave privilegiada, solo del backend) -- no se debe llamar desde el
frontend ni loguear su valor. Único punto del proyecto que usa esta clave."""
import httpx

from app.core.config import get_settings
from app.core.exceptions import ValidationError


def crear_usuario_auth(email: str, password: str) -> dict:
    """Crea un usuario en Supabase Auth (tabla auth.users) vía Admin API.
    `email_confirm=True` para que no necesite confirmar por correo -- el
    admin ya está creando la cuenta directamente.
    Devuelve el JSON de respuesta (incluye "id" = auth_user_id) si tiene
    éxito. Lanza ValidationError con mensaje claro si falla (ej: correo ya
    registrado) -- nunca se traga el error en silencio."""
    settings = get_settings()
    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    headers = {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    body = {"email": email, "password": password, "email_confirm": True}

    resp = httpx.post(url, headers=headers, json=body, timeout=10)
    if resp.status_code >= 400:
        try:
            data = resp.json()
            detail = data.get("msg") or data.get("error_description") or data.get("error") or resp.text
        except ValueError:
            detail = resp.text
        if "already" in detail.lower() or "registered" in detail.lower() or "exists" in detail.lower():
            raise ValidationError(f"Ya existe una cuenta con el correo {email}")
        raise ValidationError(f"No se pudo crear el acceso: {detail}")

    return resp.json()
