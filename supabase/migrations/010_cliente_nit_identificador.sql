-- Cliente: NIT como identificador, quitar codigo y activo, vendedor como string
-- 1. Migrar codigo a nit donde nit esté vacío
UPDATE cliente SET nit = codigo WHERE nit IS NULL OR nit = '';

-- 2. Hacer nit NOT NULL y UNIQUE
ALTER TABLE cliente ALTER COLUMN nit SET NOT NULL;
ALTER TABLE cliente ADD CONSTRAINT cliente_nit_unique UNIQUE (nit);

-- 3. Eliminar vendedor_id y agregar vendedor (VARCHAR)
ALTER TABLE cliente DROP COLUMN IF EXISTS vendedor_id;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS vendedor VARCHAR(10);

-- 4. Eliminar codigo y activo
ALTER TABLE cliente DROP COLUMN IF EXISTS codigo;
ALTER TABLE cliente DROP COLUMN IF EXISTS activo;
