-- Empleados con ciclo simplificado (gerente, jefe de almacén): solo ENTRY/EXIT,
-- sin desayuno/almuerzo. Se marca explícitamente por empleado, no por texto de cargo.
ALTER TABLE empleado
  ADD COLUMN IF NOT EXISTS solo_entrada_salida BOOLEAN NOT NULL DEFAULT false;
