-- Módulo de Planeación (Proceso): dependencias de producción, empleados
-- asignados (editable) y tareas por empleado dentro de cada dependencia.

CREATE TABLE IF NOT EXISTS dependencia (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dependencia_empleado (
  id BIGSERIAL PRIMARY KEY,
  dependencia_id BIGINT NOT NULL REFERENCES dependencia(id) ON DELETE CASCADE,
  empleado_id BIGINT NOT NULL REFERENCES empleado(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(dependencia_id, empleado_id)
);

-- dependencia_id/empleado_id se guardan directo en tarea (no solo un link a
-- dependencia_empleado) para que la tarea sobreviva como historial si luego
-- se quita al empleado de la dependencia.
CREATE TABLE IF NOT EXISTS tarea (
  id BIGSERIAL PRIMARY KEY,
  dependencia_id BIGINT NOT NULL REFERENCES dependencia(id) ON DELETE CASCADE,
  empleado_id BIGINT NOT NULL REFERENCES empleado(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'en_progreso', 'hecha')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dependencia_empleado_dependencia_id ON dependencia_empleado(dependencia_id);
CREATE INDEX IF NOT EXISTS idx_dependencia_empleado_empleado_id ON dependencia_empleado(empleado_id);
CREATE INDEX IF NOT EXISTS idx_tarea_dependencia_id ON tarea(dependencia_id);
CREATE INDEX IF NOT EXISTS idx_tarea_empleado_id ON tarea(empleado_id);
