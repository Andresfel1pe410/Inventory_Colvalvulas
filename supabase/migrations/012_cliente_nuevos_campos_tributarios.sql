-- Cliente: nuevos campos tributarios y de identificación
-- Campos requeridos: razon_social, tipo_documento, numero_identificacion, dv, regimen, pais, ciudad,
-- direccion, telefono, departamento, codigo_postal, email, responsabilidad_fiscal, detalles_tributarios, vendedor

-- 1. Agregar nuevas columnas
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS numero_identificacion VARCHAR(30);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS dv VARCHAR(5);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS regimen VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS pais VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS codigo_postal VARCHAR(20);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS responsabilidad_fiscal VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS detalles_tributarios TEXT;

-- 2. Migrar nit a numero_identificacion y tipo_documento
UPDATE cliente SET numero_identificacion = nit WHERE numero_identificacion IS NULL;
UPDATE cliente SET tipo_documento = 'NIT' WHERE tipo_documento IS NULL;
UPDATE cliente SET pais = 'Colombia' WHERE pais IS NULL;

-- 3. Hacer NOT NULL los campos obligatorios
ALTER TABLE cliente ALTER COLUMN tipo_documento SET NOT NULL;
ALTER TABLE cliente ALTER COLUMN numero_identificacion SET NOT NULL;
ALTER TABLE cliente ALTER COLUMN razon_social SET NOT NULL;

-- 4. Unique constraint: tipo_documento + numero_identificacion
ALTER TABLE cliente DROP CONSTRAINT IF EXISTS cliente_nit_unique;
ALTER TABLE cliente ADD CONSTRAINT cliente_documento_unique UNIQUE (tipo_documento, numero_identificacion);

-- 5. Eliminar columnas obsoletas
ALTER TABLE cliente DROP COLUMN IF EXISTS nit;
ALTER TABLE cliente DROP COLUMN IF EXISTS nombre_gerente;
