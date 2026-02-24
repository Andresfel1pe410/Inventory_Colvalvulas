# Múltiples usuarios simultáneos

Si el sistema se traba o saca usuarios cuando hay 2+ personas conectadas, sigue estos pasos:

## 1. Usar el Connection Pooler de Supabase (CRÍTICO)

Supabase limita las conexiones directas a PostgreSQL (~60 en plan free). Con varios usuarios, el backend puede agotar ese límite.

**Solución:** Usa la URL del **pooler** (puerto 6543) en lugar de la conexión directa (5432).

1. Entra a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. **Settings** → **Database**
3. En "Connection string", selecciona **"Transaction"** (modo pooler)
4. Copia la URI (usa puerto **6543**)
5. En Railway (o tu `.env`), actualiza `DATABASE_URL` con esa URI

Ejemplo de URI con pooler:
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

El backend detecta automáticamente el puerto 6543 y usa `NullPool` (el pooler ya gestiona las conexiones).

## 2. Workers en Railway

El `railway.json` ya tiene `--workers 3`. Más workers = más peticiones en paralelo. Si sigues con problemas, prueba con 4.

## 3. Recursos en Railway

Más CPU/RAM ayuda si las peticiones son pesadas. Pero el cuello de botella suele ser **Supabase**, no Railway. Prioriza el pooler.

## 4. Mismo navegador, dos pestañas

Si dos usuarios usan el **mismo navegador** (pestañas distintas), solo uno puede estar logueado: el token se comparte. Cada usuario debe usar un navegador o dispositivo distinto.
