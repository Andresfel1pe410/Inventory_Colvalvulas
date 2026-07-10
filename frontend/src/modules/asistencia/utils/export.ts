import * as XLSX from 'xlsx'

function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function escaparCsv(valor: unknown): string {
  const str = valor == null ? '' : String(valor)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportarCsv(filas: Record<string, unknown>[], columnas: { key: string; header: string }[], filename: string) {
  const encabezado = columnas.map((c) => escaparCsv(c.header)).join(',')
  const cuerpo = filas.map((f) => columnas.map((c) => escaparCsv(f[c.key])).join(',')).join('\n')
  const csv = `${encabezado}\n${cuerpo}`
  descargarBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' }), filename)
}

export function exportarExcel(filas: Record<string, unknown>[], columnas: { key: string; header: string }[], filename: string) {
  const datos = filas.map((f) => {
    const row: Record<string, unknown> = {}
    for (const c of columnas) row[c.header] = f[c.key]
    return row
  })
  const hoja = XLSX.utils.json_to_sheet(datos)
  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Asistencia')
  XLSX.writeFile(libro, filename)
}
