-- Agregar número de guía al pedido
ALTER TABLE pedido ADD COLUMN IF NOT EXISTS numero_guia VARCHAR(100);
