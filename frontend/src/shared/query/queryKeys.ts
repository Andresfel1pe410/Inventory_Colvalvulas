/** Query keys para React Query - cache compartido entre páginas */
export const queryKeys = {
  clientes: {
    all: ['clientes'] as const,
    list: (params?: { search?: string; limit?: number }) =>
      ['clientes', 'list', params] as const,
    detail: (id: number) => ['clientes', id] as const,
  },
  productos: {
    all: ['productos'] as const,
    list: (params?: { search?: string; limit?: number; lista?: string }) =>
      ['productos', 'list', params] as const,
    detail: (id: number) => ['productos', id] as const,
  },
  pedidos: {
    all: ['pedidos'] as const,
    list: (params?: { skip?: number; limit?: number; estados?: string }) =>
      ['pedidos', 'list', params] as const,
    detail: (id: number) => ['pedidos', id] as const,
  },
  inventario: {
    all: ['inventario'] as const,
    list: (params?: { pedido_ids?: string; limit?: number }) =>
      ['inventario', 'list', params] as const,
    producto: (id: number) => ['inventario', 'producto', id] as const,
  },
  remisiones: {
    all: ['remisiones'] as const,
    list: (params?: { skip?: number; limit?: number }) =>
      ['remisiones', 'list', params] as const,
  },
  usuarios: {
    all: ['usuarios'] as const,
    list: (params?: { skip?: number; limit?: number }) =>
      ['usuarios', 'list', params] as const,
    roles: ['usuarios', 'roles'] as const,
  },
}
