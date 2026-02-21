-- =============================================
-- Clientes: nuevos campos
-- Productos: 4 listas de precios
-- Pedidos: lista de precios y descuento
-- =============================================

-- ---------- CLIENTES ----------
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS razon_social VARCHAR(200);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS nombre_gerente VARCHAR(200);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS departamento VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS vendedor_id BIGINT REFERENCES usuario(id) ON DELETE SET NULL;

-- Migrar nombre existente a razon_social
UPDATE cliente SET razon_social = COALESCE(nombre, '') WHERE razon_social IS NULL;

-- ---------- PRODUCTOS: 4 listas de precios ----------
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_lista_1 DECIMAL(15, 2);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_lista_2 DECIMAL(15, 2);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_lista_3 DECIMAL(15, 2);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_lista_plus DECIMAL(15, 2);

-- Migrar precio_unitario a las 4 listas
UPDATE producto SET precio_lista_1 = precio_unitario WHERE precio_lista_1 IS NULL;
UPDATE producto SET precio_lista_2 = precio_unitario WHERE precio_lista_2 IS NULL;
UPDATE producto SET precio_lista_3 = precio_unitario WHERE precio_lista_3 IS NULL;
UPDATE producto SET precio_lista_plus = precio_unitario WHERE precio_lista_plus IS NULL;

-- ---------- PEDIDOS: lista y descuento ----------
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS lista_precios VARCHAR(20) DEFAULT 'lista_1';
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS descuento DECIMAL(5, 2) DEFAULT 0 CHECK (descuento >= 0 AND descuento <= 100);
