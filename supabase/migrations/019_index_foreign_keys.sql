-- Índices en claves foráneas para mejorar rendimiento (Performance Advisor)
-- Acelera JOINs y consultas por pedido_id, cliente_id, producto_id, etc.

-- detalle_pedido
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_pedido_id ON detalle_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido_producto_id ON detalle_pedido(producto_id);

-- detalle_remision
CREATE INDEX IF NOT EXISTS idx_detalle_remision_remision_id ON detalle_remision(remision_id);
CREATE INDEX IF NOT EXISTS idx_detalle_remision_producto_id ON detalle_remision(producto_id);

-- movimiento_inventario
CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_producto_id ON movimiento_inventario(producto_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_usuario_id ON movimiento_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimiento_inventario_referencia ON movimiento_inventario(referencia_tipo, referencia_id);

-- pedido
CREATE INDEX IF NOT EXISTS idx_pedido_cliente_id ON pedido(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedido_usuario_id ON pedido(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pedido_usuario_envio_id ON pedido(usuario_envio_id);

-- remision (si existe)
CREATE INDEX IF NOT EXISTS idx_remision_pedido_id ON remision(pedido_id);
CREATE INDEX IF NOT EXISTS idx_remision_cliente_id ON remision(cliente_id);

-- usuario_rol
CREATE INDEX IF NOT EXISTS idx_usuario_rol_usuario_id ON usuario_rol(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_rol_rol_id ON usuario_rol(rol_id);

-- producto_lista_precio
CREATE INDEX IF NOT EXISTS idx_producto_lista_precio_producto_id ON producto_lista_precio(producto_id);

-- vendedor_lista_precio
CREATE INDEX IF NOT EXISTS idx_vendedor_lista_precio_usuario_id ON vendedor_lista_precio(usuario_id);
