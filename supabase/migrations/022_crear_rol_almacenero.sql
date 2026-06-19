-- Crear rol "almacen" con acceso solo a inventario
INSERT INTO rol (nombre, descripcion) VALUES 
  ('almacen', 'Acceso solo a la sección de inventario')
ON CONFLICT (nombre) DO NOTHING;
