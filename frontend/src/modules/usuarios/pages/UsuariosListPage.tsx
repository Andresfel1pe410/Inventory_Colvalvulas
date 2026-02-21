import { useState, useEffect } from 'react'
import { DataTable, Column, Pagination } from '@/shared/components'
import { usuarioService } from '../services/usuario.service'
import type { UsuarioSistema } from '../types/usuario.types'

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
    header: 'Roles',
    render: (u) => u.roles?.join(', ') || '-',
  },
]

export function UsuariosListPage() {
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const load = async () => {
    setLoading(true)
    try {
      const data = await usuarioService.list({ skip: (page - 1) * limit, limit })
      setUsuarios(data)
    } catch {
      setUsuarios([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

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
    </div>
  )
}
