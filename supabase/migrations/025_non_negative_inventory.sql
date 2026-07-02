-- Asegurar que el stock actual y la cantidad actual nunca sean negativos.

UPDATE inventario
SET stock_actual = 0
WHERE stock_actual < 0;

UPDATE inventario_proceso
SET cantidad = 0
WHERE cantidad < 0;

UPDATE movimiento_inventario
SET
  stock_anterior = GREATEST(stock_anterior, 0),
  stock_nuevo = GREATEST(stock_nuevo, 0)
WHERE stock_anterior < 0 OR stock_nuevo < 0;

UPDATE movimiento_inventario_proceso
SET
  cantidad_anterior = GREATEST(cantidad_anterior, 0),
  cantidad_nueva = GREATEST(cantidad_nueva, 0)
WHERE cantidad_anterior < 0 OR cantidad_nueva < 0;

ALTER TABLE inventario
  DROP CONSTRAINT IF EXISTS inventario_stock_actual_check;

ALTER TABLE inventario
  ADD CONSTRAINT inventario_stock_actual_check
  CHECK (stock_actual >= 0);

ALTER TABLE inventario_proceso
  DROP CONSTRAINT IF EXISTS inventario_proceso_cantidad_check;

ALTER TABLE inventario_proceso
  ADD CONSTRAINT inventario_proceso_cantidad_check
  CHECK (cantidad >= 0);

ALTER TABLE movimiento_inventario
  DROP CONSTRAINT IF EXISTS movimiento_inventario_stock_nuevo_check;

ALTER TABLE movimiento_inventario
  ADD CONSTRAINT movimiento_inventario_stock_nuevo_check
  CHECK (stock_nuevo >= 0);

ALTER TABLE movimiento_inventario_proceso
  DROP CONSTRAINT IF EXISTS movimiento_inventario_proceso_cantidad_nueva_check;

ALTER TABLE movimiento_inventario_proceso
  ADD CONSTRAINT movimiento_inventario_proceso_cantidad_nueva_check
  CHECK (cantidad_nueva >= 0);