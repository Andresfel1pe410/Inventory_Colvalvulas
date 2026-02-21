-- Columna para anotación del checklist de envío
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS resumen_envio TEXT;
