-- Rol para empleados de planta con acceso de autoservicio a sus tareas
INSERT INTO rol (nombre, descripcion) VALUES
  ('empleado', 'Acceso solo a sus tareas asignadas en Planeación')
ON CONFLICT (nombre) DO NOTHING;

-- Vínculo opcional 1:1 entre usuario (login) y empleado (ficha de RRHH)
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS empleado_id BIGINT REFERENCES empleado(id) ON DELETE SET NULL;
ALTER TABLE usuario ADD CONSTRAINT usuario_empleado_id_key UNIQUE (empleado_id);
