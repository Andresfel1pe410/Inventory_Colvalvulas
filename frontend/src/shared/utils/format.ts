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

/**
 * Formatea una fecha ISO como dd/mm/aaaa hh:mm (24h).
 * Ejemplo: "2026-07-09T18:05:00Z" → "09/07/2026 13:05"
 */
export function formatFechaHora(value: string | undefined | null): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}
