-- Crear tabla de inventario de proceso (autónoma)
CREATE TABLE IF NOT EXISTS inventario_proceso (
  id BIGSERIAL PRIMARY KEY,
  referencia VARCHAR(200) NOT NULL,
  material VARCHAR(255) NOT NULL,
  cantidad BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(referencia, material)
);

-- Crear tabla de movimientos de inventario de proceso
CREATE TABLE IF NOT EXISTS movimiento_inventario_proceso (
  id BIGSERIAL PRIMARY KEY,
  inventario_proceso_id BIGINT NOT NULL REFERENCES inventario_proceso(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad BIGINT NOT NULL,
  usuario_realizo VARCHAR(100) NOT NULL,
  cantidad_anterior BIGINT NOT NULL,
  cantidad_nueva BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Crear índices
CREATE INDEX idx_movimiento_inventario_proceso_inventario_id ON movimiento_inventario_proceso(inventario_proceso_id);
CREATE INDEX idx_movimiento_inventario_proceso_created_at ON movimiento_inventario_proceso(created_at);
