import { useState, useEffect } from 'react'
import { DataTable, Column, Pagination } from '@/shared/components'
import { usuarioService, type Rol } from '../services/usuario.service'
import type { UsuarioSistema } from '../types/usuario.types'
import { LISTA_LABELS } from '@/modules/productos/types/producto.types'
import { LISTAS_PRECIOS } from '@/modules/productos/types/producto.types'

export function UsuariosListPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [roles, setRoles] = useState<Rol[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [modalUsuario, setModalUsuario] = useState<UsuarioSistema | null>(null)
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Set<number>>(new Set())
  const [listasSeleccionadas, setListasSeleccionadas] = useState<Set<string>>(new Set())
  const [guardando, setGuardando] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [data, rolesData] = await Promise.all([
        usuarioService.list({ skip: (page - 1) * limit, limit }),
        usuarioService.getRoles(),
      ])
      setUsuarios(data)
      setRoles(rolesData)
    } catch {
      setUsuarios([])
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const abrirModal = (u: UsuarioSistema) => {
    setModalUsuario(u)
    const rolIds = roles
      .filter((r) => u.roles?.includes(r.nombre))
      .map((r) => r.id)
    setRolesSeleccionados(new Set(rolIds))
    setListasSeleccionadas(new Set(u.listas_precio || []))
  }

  const toggleRol = (rolId: number) => {
    setRolesSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(rolId)) next.delete(rolId)
      else next.add(rolId)
      return next
    })
  }

  const toggleLista = (lista: string) => {
    setListasSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(lista)) next.delete(lista)
      else next.add(lista)
      return next
    })
  }

  const guardar = async () => {
    if (!modalUsuario) return
    setGuardando(true)
    try {
      await Promise.all([
        usuarioService.setRoles(modalUsuario.id, Array.from(rolesSeleccionados)),
        usuarioService.asignarListas(modalUsuario.id, Array.from(listasSeleccionadas)),
      ])
      setModalUsuario(null)
      load()
    } catch {
      // Error ya manejado por api interceptor
    } finally {
      setGuardando(false)
    }
  }

  const columns: Column<UsuarioSistema>[] = [
    { key: 'email', header: 'Email' },
    {
      key: 'nombre',
      header: 'Nombre',
      render: (u) => [u.nombre, u.apellido].filter(Boolean).join(' ') || '-',
    },
    {
      key: 'activo',
      header: 'Activo',
      render: (u) => (u.activo ? 'Sí' : 'No'),
    },
    {
      key: 'roles',
      header: 'Rol',
      render: (u) => (
        <button
          type="button"
          onClick={() => abrirModal(u)}
          className="text-left text-primary-600 hover:underline"
        >
          {u.roles?.join(', ') || '—'}
        </button>
      ),
    },
    {
      key: 'listas_precio',
      header: 'Listas',
      render: (u) => (
        <button
          type="button"
          onClick={() => abrirModal(u)}
          className="text-left text-primary-600 hover:underline"
        >
          {u.roles?.includes('vendedor')
            ? (u.listas_precio || []).map((l) => LISTA_LABELS[l] || l).join(', ') || 'Asignar'
            : '—'}
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
      </div>
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={usuarios}
            keyExtractor={(u) => u.id}
            emptyMessage="No hay usuarios"
          />
          <Pagination
            page={page}
            total={usuarios.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}

      {modalUsuario && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setModalUsuario(null)} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Rol y listas para {modalUsuario.email}
            </h3>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-slate-700">Rol</p>
              <div className="space-y-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rolesSeleccionados.has(r.id)}
                      onChange={() => toggleRol(r.id)}
                      className="rounded border-slate-300"
                    />
                    <span>{r.nombre}</span>
                    {r.descripcion && (
                      <span className="text-xs text-slate-500">({r.descripcion})</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Listas de precios (solo para vendedor)
              </p>
              <div className="space-y-2">
                {LISTAS_PRECIOS.map((lista) => (
                  <label key={lista} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={listasSeleccionadas.has(lista)}
                      onChange={() => toggleLista(lista)}
                      className="rounded border-slate-300"
                    />
                    <span>{LISTA_LABELS[lista] || lista}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalUsuario(null)}
                className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className="rounded bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
