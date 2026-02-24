-- Eliminar índices no usados (Performance Advisor - Unused Index)
-- Elimina índices con idx_scan=0 que no son PK ni soportan UNIQUE.
-- Excluye los índices creados en 019 (los necesitamos para las FKs).

DO $$
DECLARE
    r RECORD;
    idx_keep text[] := ARRAY[
        'idx_detalle_pedido_pedido_id', 'idx_detalle_pedido_producto_id',
        'idx_detalle_remision_remision_id', 'idx_detalle_remision_producto_id',
        'idx_movimiento_inventario_producto_id', 'idx_movimiento_inventario_usuario_id',
        'idx_movimiento_inventario_referencia', 'idx_pedido_cliente_id',
        'idx_pedido_usuario_id', 'idx_pedido_usuario_envio_id',
        'idx_remision_pedido_id', 'idx_remision_cliente_id',
        'idx_usuario_rol_usuario_id', 'idx_usuario_rol_rol_id',
        'idx_producto_lista_precio_producto_id', 'idx_vendedor_lista_precio_usuario_id',
        'idx_producto_codigo'
    ];
BEGIN
    FOR r IN
        SELECT s.schemaname, s.indexrelname
        FROM pg_stat_user_indexes s
        WHERE s.schemaname = 'public'
          AND s.idx_scan = 0
          AND s.indexrelname NOT LIKE '%_pkey'
          AND s.indexrelname != ALL(idx_keep)
          AND NOT EXISTS (
              SELECT 1 FROM pg_constraint con
              WHERE con.conindid = s.indexrelid
                AND con.contype IN ('p', 'u')
          )
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexrelname);
        RAISE NOTICE 'Dropped unused index: %.%', r.schemaname, r.indexrelname;
    END LOOP;
END $$;
