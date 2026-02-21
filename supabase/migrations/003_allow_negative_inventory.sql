-- =============================================
-- Permitir inventario negativo
-- Stock negativo indica qué falta para completar pedidos
-- =============================================

-- Inventario: quitar CHECK stock_actual >= 0
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'inventario'::regclass AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%stock_actual%'
    ) LOOP
        EXECUTE format('ALTER TABLE inventario DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

-- Movimiento inventario: quitar CHECK stock_anterior y stock_nuevo >= 0
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'movimiento_inventario'::regclass AND contype = 'c'
        AND (pg_get_constraintdef(oid) LIKE '%stock_anterior%' OR pg_get_constraintdef(oid) LIKE '%stock_nuevo%')
    ) LOOP
        EXECUTE format('ALTER TABLE movimiento_inventario DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;
