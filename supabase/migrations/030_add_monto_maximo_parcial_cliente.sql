-- Agregar monto_maximo_parcial a la tabla cliente
ALTER TABLE cliente
  ADD COLUMN IF NOT EXISTS monto_maximo_parcial NUMERIC(14, 2) DEFAULT NULL;

COMMENT ON COLUMN cliente.monto_maximo_parcial IS 'Monto maximo en dinero permitido para pedidos cuando el estado es enviar_parcial';
