export interface Producto {
  id: number
  codigo: string
  referencia: string
  material: string
  precio: number
  lista: string
  created_at: string
  updated_at: string
}

export interface ProductoCreate {
  codigo: string
  referencia: string
  material: string
  precio: number
  lista: string
}

export interface ProductoUpdate {
  codigo?: string
  referencia?: string
  material?: string
  precio?: number
  lista?: string
}

export const LISTAS_PRECIOS = ['lista_1', 'lista_2', 'lista_3', 'lista_plus'] as const
export type ListaPrecios = (typeof LISTAS_PRECIOS)[number]

export const LISTA_LABELS: Record<string, string> = {
  lista_1: 'Lista 1',
  lista_2: 'Lista 2',
  lista_3: 'Lista 3',
  lista_plus: 'Lista Plus',
}

/** Obtiene el precio del producto si pertenece a la lista seleccionada */
export function getPrecioByLista(p: Producto, lista: string): number {
  return p.lista === lista ? (p.precio ?? 0) : 0
}
