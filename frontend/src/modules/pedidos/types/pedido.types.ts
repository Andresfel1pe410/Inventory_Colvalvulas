export interface DetallePedido {
  id: number
  pedido_id: number
  producto_id: number
  cantidad: number
  precio_unitario: number
  subtotal: number
}

export interface Pedido {
  id: number
  numero_pedido: string
  cliente_id: number
  usuario_id: number
  estado: string
  subtotal: number
  total: number
  observaciones?: string
  resumen_envio?: string
  fecha_envio?: string
  usuario_envio_id?: number
  transportadora?: string
  numero_factura?: string
  numero_guia?: string
  lista_precios?: string
  descuento?: number
  created_at: string
  updated_at: string
}

export interface PedidoConDetalles extends Pedido {
  detalles: DetallePedido[]
  usuario_envio?: { id: number; nombre: string; email: string }
}

export interface DetallePedidoCreate {
  producto_id: number
  cantidad: number
  precio_unitario?: number
}

export interface PedidoCreate {
  cliente_id: number
  observaciones?: string
  detalles: DetallePedidoCreate[]
  lista_precios?: string
  descuento?: number
}

export interface PedidoUpdateFull {
  cliente_id: number
  observaciones?: string
  lista_precios?: string
  descuento?: number
  detalles: DetallePedidoCreate[]
}
