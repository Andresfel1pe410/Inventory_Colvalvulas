-- Asignación de listas de precios a vendedores (admin asigna qué listas ve cada vendedor)
CREATE TABLE IF NOT EXISTS vendedor_lista_precio (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  lista VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, lista)
);

CREATE INDEX IF NOT EXISTS idx_vendedor_lista_usuario ON vendedor_lista_precio(usuario_id);
