"""Utilidades compartidas por las pruebas."""
import uuid


def fake_auth_id(seed: str) -> str:
    """UUID determinístico a partir de un texto. `usuario.auth_user_id` es una
    columna UUID (igual que `auth.users.id` en Supabase), así que las pruebas
    no pueden usar textos arbitrarios como 'auth-1'."""
    return str(uuid.uuid5(uuid.NAMESPACE_URL, seed))
