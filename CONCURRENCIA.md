# Múltiples usuarios simultáneos

Si el sistema se traba o se pone lento con 2+ personas conectadas, la causa real casi siempre es
**consultas N+1** (código haciendo una query por fila en vez de una sola con `JOIN`/`joinedload`) o
conexiones a la base de datos que no se reutilizan. Revisa eso primero — más workers o más CPU/RAM
solo esconden el síntoma.

## 1. Connection Pooler de Supabase

Supabase limita las conexiones directas a PostgreSQL. Usa la URL del **pooler** (puerto 6543) en
lugar de la conexión directa (5432):

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Settings** → **Database**
3. En "Connection string", selecciona **"Transaction"** (modo pooler)
4. Copia la URI (usa puerto **6543**)
5. En Railway (o tu `.env`), actualiza `DATABASE_URL` con esa URI

Ejemplo de URI con pooler:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Importante:** aunque uses el pooler de Supabase, el backend (`app/core/database.py`) mantiene su
propio pool pequeño de conexiones (`pool_size=2, max_overflow=2`) en vez de `NullPool`. El proceso
uvicorn es de larga duración, así que reutilizar conexiones ya autenticadas evita pagar el costo de
TCP+TLS+auth en cada request — usar `NullPool` ahí fue justamente lo que agravaba el problema con
varios usuarios a la vez.

Con **4 workers** (sección 3), el total de conexiones que el backend puede abrir contra Supabase es
`4 * (pool_size + max_overflow) = 16`. Si subes workers de nuevo, vuelve a multiplicar y compáralo
contra el límite del pooler en tu plan de Supabase — ese es el techo real, no un número arbitrario.

## 2. Revisa N+1 antes de subir workers/recursos

Un endpoint con N+1 puede convertir la carga de una pantalla en cientos de consultas SQL. Con pocos
usuarios concurrentes eso ya satura el pool de conexiones y hace que la app "se caiga". Antes de subir
workers o el plan de Railway, cuenta las queries que dispara el endpoint lento (ver el caso de
Control Pedidos, que bajó de ~500 queries/carga a 1 con `joinedload`).

## 3. Workers en Railway

`railway.json`/`nixpacks.toml` usan `--workers 4`. Como los endpoints son rutas síncronas (`def`, no
`async def`), FastAPI las corre en un threadpool interno por worker — eso ya maneja varias requests
concurrentes dentro de un mismo worker, pero el trabajo CPU-bound (serializar JSON, lógica de negocio)
sigue compitiendo por el GIL de Python dentro de un mismo proceso. Con más usuarios simultáneos
(ventas + RRHH), más procesos worker dan paralelismo real entre núcleos. Se bajó a 2 en un momento
dado como parte de una limpieza de conexiones a la DB, pero el cuello de botella real de esa vez
era N+1 y `NullPool` (ver abajo) — al volver a subir el tráfico, 2 workers se quedaron cortos y se
subió de nuevo a 4.

Si subes workers más allá de 4, recalcula el total de conexiones a la DB (sección 1) contra el
límite del pooler de Supabase — eso sí puede convertirse en el cuello de botella real.

## 4. Mismo navegador, dos pestañas

Si dos usuarios usan el **mismo navegador** (pestañas distintas), solo uno puede estar logueado: el
token se comparte. Cada usuario debe usar un navegador o dispositivo distinto.
