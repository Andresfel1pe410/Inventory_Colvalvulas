-- =============================================
-- Pedido: nuevos estados y datos de envío
-- Estados: en_espera, en_proceso, enviado, cancelado
-- Al marcar enviado: fecha_envio, usuario_envio_id, transportadora, numero_factura
-- =============================================

-- Agregar columnas de envío a pedido
ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS fecha_envio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usuario_envio_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transportadora VARCHAR(50),
  ADD COLUMN IF NOT EXISTS numero_factura VARCHAR(100);

-- Eliminar constraint antiguo de estado (antes de actualizar)
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'pedido'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%estado%'
  ) LOOP
    EXECUTE format('ALTER TABLE pedido DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- Actualizar estados existentes al nuevo esquema
-- borrador/confirmado -> en_espera, en_proceso/empaquetado -> en_proceso, despachado -> enviado
UPDATE pedido SET estado = 'en_espera' WHERE estado IN ('borrador', 'confirmado');
UPDATE pedido SET estado = 'en_proceso' WHERE estado IN ('en_proceso', 'empaquetado');
UPDATE pedido SET estado = 'enviado' WHERE estado = 'despachado';

ALTER TABLE pedido ADD CONSTRAINT pedido_estado_check
  CHECK (estado IN ('en_espera', 'en_proceso', 'enviado', 'cancelado'));
