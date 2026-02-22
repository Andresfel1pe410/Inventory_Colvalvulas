export interface ProductoListaPrecio {
  id?: number
  producto_id?: number
  lista: string
  codigo: string
  precio: number
  created_at?: string
  updated_at?: string
}

export interface Producto {
  id: number
  referencia: string
  material: string
  listas_precio: ProductoListaPrecio[]
  created_at: string
  updated_at: string
}

export interface ProductoListaPrecioInput {
  lista: string
  codigo: string
  precio: number
}

export interface ProductoCreate {
  referencia: string
  material: string
  listas_precio: ProductoListaPrecioInput[]
}

export interface ProductoUpdate {
  referencia?: string
  material?: string
  listas_precio?: ProductoListaPrecioInput[]
}

export const LISTAS_PRECIOS = [
  'lista_1',
  'lista_2',
  'lista_3',
  'lista_plus',
  'lista_plus_costa',
] as const
export type ListaPrecios = (typeof LISTAS_PRECIOS)[number]

export const LISTA_LABELS: Record<string, string> = {
  lista_1: 'Lista 1',
  lista_2: 'Lista 2',
  lista_3: 'Lista 3',
  lista_plus: 'Lista Plus',
  lista_plus_costa: 'Lista Plus Costa',
}

/** Obtiene el precio del producto para la lista indicada desde listas_precio */
export function getPrecioByLista(p: Producto, lista: string): number {
  const lp = p.listas_precio?.find((l) => l.lista === lista)
  return lp ? (lp.precio ?? 0) : 0
}

/** Indica si el producto tiene entrada en la lista indicada */
export function tieneLista(p: Producto, lista: string): boolean {
  return p.listas_precio?.some((l) => l.lista === lista) ?? false
}

/** Obtiene el código del producto para la lista indicada (para mostrar en selects, etc.) */
export function getCodigoByLista(p: Producto, lista: string): string {
  const lp = p.listas_precio?.find((l) => l.lista === lista)
  return lp?.codigo ?? ''
}

/** Código para mostrar en listas genéricas (usa el primero disponible) */
export function getCodigoDisplay(p: Producto): string {
  return p.listas_precio?.[0]?.codigo ?? ''
}
