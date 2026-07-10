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
propio pool pequeño de conexiones (`pool_size=3, max_overflow=2`) en vez de `NullPool`. El proceso
uvicorn es de larga duración, así que reutilizar conexiones ya autenticadas evita pagar el costo de
TCP+TLS+auth en cada request — usar `NullPool` ahí fue justamente lo que agravaba el problema con
varios usuarios a la vez.

## 2. Revisa N+1 antes de subir workers/recursos

Un endpoint con N+1 puede convertir la carga de una pantalla en cientos de consultas SQL. Con pocos
usuarios concurrentes eso ya satura el pool de conexiones y hace que la app "se caiga". Antes de subir
workers o el plan de Railway, cuenta las queries que dispara el endpoint lento (ver el caso de
Control Pedidos, que bajó de ~500 queries/carga a 1 con `joinedload`).

## 3. Workers en Railway

`railway.json`/`nixpacks.toml` usan `--workers 2`. Como los endpoints son rutas síncronas (`def`, no
`async def`), FastAPI las corre en un threadpool interno por worker, así que 1-2 workers ya manejan
varios usuarios concurrentes sin bloquearse. Solo sube workers si confirmas que el cuello de botella
es CPU y no queries lentas o N+1.

## 4. Mismo navegador, dos pestañas

Si dos usuarios usan el **mismo navegador** (pestañas distintas), solo uno puede estar logueado: el
token se comparte. Cada usuario debe usar un navegador o dispositivo distinto.
