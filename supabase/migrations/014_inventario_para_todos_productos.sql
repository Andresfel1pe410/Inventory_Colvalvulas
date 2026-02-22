-- Crear registro de inventario para cada producto que no tenga uno
INSERT INTO inventario (producto_id, stock_actual, stock_minimo)
SELECT p.id, 0, 0
FROM producto p
WHERE NOT EXISTS (SELECT 1 FROM inventario i WHERE i.producto_id = p.id);
