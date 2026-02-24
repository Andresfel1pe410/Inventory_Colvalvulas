-- REVERTIR migración 019: eliminar los índices que creó
-- Ejecuta esto en Supabase SQL Editor para volver al estado anterior

DROP INDEX IF EXISTS public.idx_detalle_pedido_pedido_id;
DROP INDEX IF EXISTS public.idx_detalle_pedido_producto_id;

DROP INDEX IF EXISTS public.idx_detalle_remision_remision_id;
DROP INDEX IF EXISTS public.idx_detalle_remision_producto_id;

DROP INDEX IF EXISTS public.idx_movimiento_inventario_producto_id;
DROP INDEX IF EXISTS public.idx_movimiento_inventario_usuario_id;
DROP INDEX IF EXISTS public.idx_movimiento_inventario_referencia;

DROP INDEX IF EXISTS public.idx_pedido_cliente_id;
DROP INDEX IF EXISTS public.idx_pedido_usuario_id;
DROP INDEX IF EXISTS public.idx_pedido_usuario_envio_id;

DROP INDEX IF EXISTS public.idx_remision_pedido_id;
DROP INDEX IF EXISTS public.idx_remision_cliente_id;

DROP INDEX IF EXISTS public.idx_usuario_rol_usuario_id;
DROP INDEX IF EXISTS public.idx_usuario_rol_rol_id;

DROP INDEX IF EXISTS public.idx_producto_lista_precio_producto_id;
DROP INDEX IF EXISTS public.idx_vendedor_lista_precio_usuario_id;
