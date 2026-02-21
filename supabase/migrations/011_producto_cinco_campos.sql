-- Producto: 5 campos: codigo, referencia, material, precio, lista
-- 1. Agregar nuevas columnas
ALTER TABLE producto ADD COLUMN IF NOT EXISTS referencia VARCHAR(200);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS material VARCHAR(255);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio DECIMAL(15, 2);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS lista VARCHAR(20);

-- 2. Migrar datos existentes
UPDATE producto SET referencia = COALESCE(nombre, codigo) WHERE referencia IS NULL;
UPDATE producto SET material = COALESCE(descripcion, '') WHERE material IS NULL;
UPDATE producto SET precio = COALESCE(precio_lista_1, precio_lista_2, precio_lista_3, precio_lista_plus, 0) WHERE precio IS NULL;
UPDATE producto SET lista = 'lista_1' WHERE lista IS NULL;

-- 3. Hacer NOT NULL y constraint de lista
ALTER TABLE producto ALTER COLUMN referencia SET NOT NULL;
ALTER TABLE producto ALTER COLUMN material SET NOT NULL;
ALTER TABLE producto ALTER COLUMN precio SET NOT NULL;
ALTER TABLE producto ALTER COLUMN lista SET NOT NULL;
ALTER TABLE producto ADD CONSTRAINT producto_lista_check CHECK (lista IN ('lista_1', 'lista_2', 'lista_3', 'lista_plus'));

-- 4. Eliminar columnas antiguas
ALTER TABLE producto DROP COLUMN IF EXISTS nombre;
ALTER TABLE producto DROP COLUMN IF EXISTS descripcion;
ALTER TABLE producto DROP COLUMN IF EXISTS unidad_medida;
ALTER TABLE producto DROP COLUMN IF EXISTS precio_lista_1;
ALTER TABLE producto DROP COLUMN IF EXISTS precio_lista_2;
ALTER TABLE producto DROP COLUMN IF EXISTS precio_lista_3;
ALTER TABLE producto DROP COLUMN IF EXISTS precio_lista_plus;
ALTER TABLE producto DROP COLUMN IF EXISTS activo;
