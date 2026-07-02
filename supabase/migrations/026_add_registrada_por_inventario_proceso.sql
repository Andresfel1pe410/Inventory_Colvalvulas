-- Guardar quién registró el movimiento además del responsable interno.
ALTER TABLE movimiento_inventario_proceso
  ADD COLUMN IF NOT EXISTS registrada_por VARCHAR(150);

UPDATE movimiento_inventario_proceso
SET registrada_por = COALESCE(registrada_por, usuario_realizo)
WHERE registrada_por IS NULL OR registrada_por = '';

ALTER TABLE movimiento_inventario_proceso
  ALTER COLUMN registrada_por SET DEFAULT '';

ALTER TABLE movimiento_inventario_proceso
  ALTER COLUMN registrada_por SET NOT NULL;