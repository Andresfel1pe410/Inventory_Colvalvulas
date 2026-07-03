-- Crear rol "auditor_contable": único autorizado para modificar Estado Cliente
INSERT INTO rol (nombre, descripcion) VALUES
  ('auditor_contable', 'Único rol autorizado para modificar el Estado Cliente del cliente')
ON CONFLICT (nombre) DO NOTHING;
