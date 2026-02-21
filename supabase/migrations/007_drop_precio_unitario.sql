-- Eliminar precio_unitario de producto (las 4 listas ya tienen los precios)
ALTER TABLE producto DROP COLUMN IF EXISTS precio_unitario;
