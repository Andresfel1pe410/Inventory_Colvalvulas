# Múltiples usuarios simultáneos

Si el sistema se traba o se pone lento con varias personas conectadas, revisa en este orden:
**I/O bloqueante dentro de `async def`**, **consultas N+1** y **conexiones a la BD**. Subir workers
o CPU/RAM solo esconde el síntoma.

## 1. Modelo de concurrencia (1 worker)

El backend corre con **1 worker** de uvicorn (`WEB_CONCURRENCY`, por defecto 1).

| Tipo de código | Cómo declararlo | Por qué |
|---|---|---|
| Endpoints y dependencias que usan la BD (SQLAlchemy síncrono) | `def` | FastAPI los corre en un threadpool (`THREADPOOL_SIZE`, 40 hilos): varias peticiones esperan a la BD en paralelo |
| Código que llama a servicios externos lentos (agente/LLM, APIs) | `async def` + `await get_http_client()...` (`app/core/http_client.py`) | Miles de esperas concurrentes sin ocupar hilos |

> **Regla de oro:** nunca hagas I/O bloqueante (`db.query`, `httpx.get`, `requests`, `time.sleep`)
> dentro de un `async def`. Corre en el event loop y frena **todas** las peticiones del worker.
> Ese era el problema original: `get_current_user` era `async def` y consultaba la BD, así que el
> login de cada petición se ejecutaba uno detrás de otro (con 4 workers solo había 4 filas).

Medido localmente (10 peticiones simultáneas, 0.3 s de latencia simulada por consulta):
antes ~3.2 s (serializado), después ~0.4 s.

## 2. Connection Pooler de Supabase

Usa la URL del **pooler en modo Transaction** (puerto 6543):

1. [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Settings** → **Database**
2. En "Connection string", selecciona **"Transaction"** y copia la URI (puerto **6543**)
3. Ponla en `DATABASE_URL` (Railway y `.env`)

`app/core/database.py`:
- Fuerza el driver **psycopg 3** (`postgresql+psycopg://`) aunque la URL diga `postgresql://`,
  para que local y producción usen el mismo driver.
- Desactiva los *prepared statements* (`prepare_threshold=None`): PgBouncer en modo transacción no
  los soporta y causan errores intermitentes bajo carga.
- Pool por worker: `DB_POOL_SIZE` (10) + `DB_MAX_OVERFLOW` (10). Total de conexiones contra Supabase =
  `workers × (DB_POOL_SIZE + DB_MAX_OVERFLOW)`. Compáralo con el límite de clientes del pooler de tu plan.

## 3. Una sola consulta para autenticar

`get_current_user` trae el usuario **y sus roles** en una sola consulta (JOIN), y `get_current_roles`
la reutiliza en todo el request (FastAPI cachea las dependencias por petición). Para verificar
permisos en un endpoint usa `Depends(require_admin)`, `Depends(require_roles(...))` o
`roles: list[str] = Depends(get_current_roles)`. **No** vuelvas a consultar los roles en la BD.

## 4. Revisa N+1 antes de subir workers/recursos

Un endpoint con N+1 puede convertir la carga de una pantalla en cientos de consultas. Cuenta las
queries del endpoint lento (Control Pedidos bajó de ~500 queries/carga a 1 con `joinedload`).

## 5. Cuándo subir workers

Con 1 worker, el trabajo de CPU (serializar JSON, lógica) comparte el GIL de Python. Si con muchos
más usuarios la CPU del contenedor se satura (no la BD), sube `WEB_CONCURRENCY` en Railway y
recalcula el total de conexiones (sección 2).

## 6. Mismo navegador, dos pestañas

Si dos usuarios usan el **mismo navegador**, solo uno puede estar logueado: el token se comparte.
Cada usuario debe usar un navegador o dispositivo distinto.
