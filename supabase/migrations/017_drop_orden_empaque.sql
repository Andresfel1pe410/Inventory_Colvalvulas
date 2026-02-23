-- Eliminar orden_empaque y detalle_empaque (no se usan; remisiones se generan desde pedidos enviados)
-- Orden: 1) quitar FK de remision, 2) eliminar políticas, 3) eliminar trigger, 4) eliminar tablas

-- 1. Quitar la columna orden_empaque_id de remision (tiene FK a orden_empaque)
ALTER TABLE remision DROP CONSTRAINT IF EXISTS remision_orden_empaque_id_fkey;
ALTER TABLE remision DROP COLUMN IF EXISTS orden_empaque_id;

-- 2. Eliminar políticas RLS de orden_empaque y detalle_empaque
DROP POLICY IF EXISTS "usuarios_autenticados_select_orden_empaque" ON orden_empaque;
DROP POLICY IF EXISTS "usuarios_autenticados_select_detalle_empaque" ON detalle_empaque;
DROP POLICY IF EXISTS "admin_insert_orden_empaque" ON orden_empaque;
DROP POLICY IF EXISTS "admin_delete_orden_empaque" ON orden_empaque;
DROP POLICY IF EXISTS "admin_insert_detalle_empaque" ON detalle_empaque;
DROP POLICY IF EXISTS "admin_delete_detalle_empaque" ON detalle_empaque;
DROP POLICY IF EXISTS "authenticated_update_orden_empaque" ON orden_empaque;
DROP POLICY IF EXISTS "authenticated_update_detalle_empaque" ON detalle_empaque;

-- 3. Eliminar trigger de orden_empaque
DROP TRIGGER IF EXISTS update_orden_empaque_updated_at ON orden_empaque;

-- 4. Eliminar tablas (detalle_empaque primero por la FK)
DROP TABLE IF EXISTS detalle_empaque;
DROP TABLE IF EXISTS orden_empaque;
