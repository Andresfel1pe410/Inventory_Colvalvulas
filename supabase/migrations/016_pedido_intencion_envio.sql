-- Campo para indicar intención de envío: enviar, enviar_parcial, no_enviar
ALTER TABLE pedido
ADD COLUMN IF NOT EXISTS intencion_envio VARCHAR(20) DEFAULT NULL;

COMMENT ON COLUMN pedido.intencion_envio IS 'Intención de envío: enviar, enviar_parcial, no_enviar';
