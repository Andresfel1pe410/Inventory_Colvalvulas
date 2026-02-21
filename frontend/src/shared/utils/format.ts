/**
 * Formatea un número como pesos colombianos (COP).
 * Ejemplo: 1234567.89 → "$1.234.567,89"
 */
export function formatPesos(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '-'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
