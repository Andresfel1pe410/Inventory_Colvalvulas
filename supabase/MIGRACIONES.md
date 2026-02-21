# Cómo ejecutar migraciones en Supabase

## Opción 1: SQL Editor de Supabase (recomendado)

1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **SQL Editor**
3. Ejecuta las migraciones **en orden**:

### Primera vez (base de datos vacía)

1. Copia el contenido de `migrations/001_initial_schema.sql`
2. Pégalo en el SQL Editor y haz clic en **Run**
3. Copia el contenido de `migrations/002_sync_usuario_on_signup.sql` y ejecútalo

### Si ya tienes la base creada y quieres permitir stock negativo

1. Ejecuta solo `migrations/003_allow_negative_inventory.sql`

---

## Opción 2: Supabase CLI

Si tienes [Supabase CLI](https://supabase.com/docs/guides/cli) instalado:

```bash
# Vincular proyecto (solo la primera vez)
supabase link --project-ref TU_PROJECT_REF

# Aplicar migraciones
supabase db push
```

Las migraciones en `supabase/migrations/` se ejecutarán automáticamente.

---

## Opción 3: Script Python (desde tu máquina)

Puedes ejecutar el SQL directamente con `psycopg2` usando tu `DATABASE_URL`:

```python
import psycopg2
from pathlib import Path

conn = psycopg2.connect("tu_DATABASE_URL")
for f in sorted(Path("supabase/migrations").glob("*.sql")):
    sql = f.read_text(encoding="utf-8")
    conn.cursor().execute(sql)
conn.commit()
conn.close()
```

---

## Nota sobre MCP

No hay un MCP de Supabase conectado en este proyecto. Las migraciones se ejecutan manualmente en el SQL Editor o con la CLI. Si quieres automatizar desde Cursor, la opción más directa es usar el SQL Editor en el navegador.
