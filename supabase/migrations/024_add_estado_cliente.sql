-- Estado del cliente como fuente de verdad para pedidos
ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS estado_cliente VARCHAR(20);

UPDATE cliente
SET estado_cliente = COALESCE(estado_cliente, 'enviar')
WHERE estado_cliente IS NULL;

ALTER TABLE cliente
  ALTER COLUMN estado_cliente SET DEFAULT 'enviar';

ALTER TABLE cliente
  ALTER COLUMN estado_cliente SET NOT NULL;

ALTER TABLE cliente
  DROP CONSTRAINT IF EXISTS cliente_estado_cliente_check;

ALTER TABLE cliente
  ADD CONSTRAINT cliente_estado_cliente_check
  CHECK (estado_cliente IN ('enviar', 'enviar_parcial', 'no_enviar', 'solo_contado'));