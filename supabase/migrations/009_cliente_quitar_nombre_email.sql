-- Eliminar columna nombre de cliente (se usa razon_social). Mantener email.
UPDATE cliente SET razon_social = COALESCE(nombre, codigo) WHERE razon_social IS NULL OR razon_social = '';
ALTER TABLE cliente DROP COLUMN IF EXISTS nombre;
ALTER TABLE cliente ALTER COLUMN razon_social SET NOT NULL;
