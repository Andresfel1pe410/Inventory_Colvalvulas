"""Cliente HTTP asíncrono compartido.

Para código `async def` (por ejemplo, el futuro agente que llamará a un LLM
o a APIs externas). Se crea una sola vez en el `lifespan` de la app y
reutiliza conexiones (keep-alive), en vez de abrir un cliente por petición.

Uso dentro de un endpoint `async def`:

    from app.core.http_client import get_http_client

    async def mi_endpoint():
        resp = await get_http_client().post(url, json=payload)

No usar `httpx.get/post` (síncronos) ni `requests` dentro de `async def`:
bloquean el event loop y frenan todas las peticiones del worker.
"""
import httpx

_client: httpx.AsyncClient | None = None


async def abrir_http_client() -> None:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
        )


async def cerrar_http_client() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


def get_http_client() -> httpx.AsyncClient:
    if _client is None:
        raise RuntimeError("El cliente HTTP no está inicializado (se abre en el lifespan de la app)")
    return _client
