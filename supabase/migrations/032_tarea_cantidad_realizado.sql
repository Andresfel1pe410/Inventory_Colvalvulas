-- Cantidad pedida y cantidad realizada por tarea de Planeación, para poder
-- comparar cuánto se pidió contra cuánto se completó al final.
ALTER TABLE tarea ADD COLUMN IF NOT EXISTS cantidad INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tarea ADD COLUMN IF NOT EXISTS realizado INTEGER NOT NULL DEFAULT 0;
