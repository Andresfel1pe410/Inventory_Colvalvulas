-- Corregir secuencia de producto cuando está desincronizada (ej: después de importar datos con IDs explícitos)
-- El siguiente INSERT usará el ID correcto (max+1)
SELECT setval(
  pg_get_serial_sequence('producto', 'id'),
  COALESCE((SELECT MAX(id) FROM producto), 1)
);
