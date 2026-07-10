-- Módulo Recursos Humanos: empleados y eventos de asistencia biométrica (ESP32 + AS608)

CREATE TABLE IF NOT EXISTS empleado (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  documento VARCHAR(30) NOT NULL UNIQUE,
  cargo VARCHAR(100),
  telefono VARCHAR(50),
  activo BOOLEAN NOT NULL DEFAULT true,
  fingerprint_id INTEGER UNIQUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evento_asistencia (
  id BIGSERIAL PRIMARY KEY,
  empleado_id BIGINT NOT NULL REFERENCES empleado(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(20) NOT NULL
    CHECK (tipo_evento IN ('ENTRY','BREAKFAST_START','BREAKFAST_END','LUNCH_START','LUNCH_END','EXIT')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_evento_asistencia_empleado_id ON evento_asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_evento_asistencia_timestamp ON evento_asistencia(timestamp);
