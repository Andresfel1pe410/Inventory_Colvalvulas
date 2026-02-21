export interface Producto {
  id: number
  codigo: string
  nombre: string
  descripcion?: string
  unidad_medida: string
  precio_lista_1?: number
  precio_lista_2?: number
  precio_lista_3?: number
  precio_lista_plus?: number
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ProductoCreate {
  codigo: string
  nombre: string
  descripcion?: string
  unidad_medida?: string
  precio_lista_1?: number
  precio_lista_2?: number
  precio_lista_3?: number
  precio_lista_plus?: number
  activo?: boolean
}

export interface ProductoUpdate {
  codigo?: string
  nombre?: string
  descripcion?: string
  unidad_medida?: string
  precio_lista_1?: number
  precio_lista_2?: number
  precio_lista_3?: number
  precio_lista_plus?: number
  activo?: boolean
}

export const LISTAS_PRECIOS = ['lista_1', 'lista_2', 'lista_3', 'lista_plus'] as const
export type ListaPrecios = (typeof LISTAS_PRECIOS)[number]

export function getPrecioByLista(p: Producto, lista: string): number {
  const m: Record<string, number | undefined> = {
    lista_1: p.precio_lista_1,
    lista_2: p.precio_lista_2,
    lista_3: p.precio_lista_3,
    lista_plus: p.precio_lista_plus,
  }
  const v = m[lista]
  if (v != null) return v
  return (
    p.precio_lista_1 ?? p.precio_lista_2 ?? p.precio_lista_3 ?? p.precio_lista_plus ?? 0
  )
}
