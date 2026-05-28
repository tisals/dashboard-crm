import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { getUsuarios, createUsuario, updateUsuario, deleteUsuario, getRoles } from '../api/crmApi'
import type { Usuario, UsuarioCreate } from '../api/types'
import { SlidePanel } from '../components/SlidePanel'

export function UsuariosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)

  const { data: usuariosRes, isLoading } = useQuery({
    queryKey: ['usuarios', search],
    queryFn: () => getUsuarios({ search: search || undefined }),
  })

  const { data: rolesRes } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const usuarios = usuariosRes?.data?.data ?? []
  const roles = rolesRes?.data?.data ?? []

  const createMutation = useMutation({
    mutationFn: createUsuario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<UsuarioCreate> }) =>
      updateUsuario(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      setShowModal(false)
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUsuario,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  function handleEdit(u: Usuario) {
    setEditing(u)
    setShowModal(true)
  }

  function handleDelete(id: number) {
    if (window.confirm('¿Eliminar este usuario?')) {
      deleteMutation.mutate(id)
    }
  }

  function handleClose() {
    setShowModal(false)
    setEditing(null)
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Usuarios</h1>
          <p className="text-slate-400">Gestión de usuarios del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors"
        >
          <Plus size={18} />
          Nuevo Usuario
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar usuarios…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando…</div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No hay usuarios registrados.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left text-slate-400 text-sm">
                <th className="p-4 font-medium">Nombre</th>
                <th className="p-4 font-medium">Email</th>
                <th className="p-4 font-medium">Rol</th>
                <th className="p-4 font-medium">Estado</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u: Usuario) => (
                <tr key={u.id} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="p-4 text-slate-200 font-medium">{u.nombre}</td>
                  <td className="p-4 text-slate-400">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-700 rounded-lg text-xs text-slate-300">
                      {roles.find(r => r.id === u.rol_id)?.nombre ?? '—'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      u.estado === 'Activo'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-600/30 text-slate-400'
                    }`}>
                      {u.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-teal-400 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      </div>

      {showModal && (
        <UsuarioFormModal
          usuario={editing}
          roles={roles}
          onClose={handleClose}
          onSubmit={(payload) => {
            if (editing) {
              updateMutation.mutate({ id: editing.id, payload })
            } else {
              createMutation.mutate(payload as UsuarioCreate)
            }
          }}
          isMutating={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Modal Form ─────────────────────────────────────

function UsuarioFormModal({
  usuario,
  roles,
  onClose,
  onSubmit,
  isMutating,
}: {
  usuario: Usuario | null
  roles: { id: number; nombre: string }[]
  onClose: () => void
  onSubmit: (payload: Partial<UsuarioCreate>) => void
  isMutating: boolean
}) {
  const [nombre, setNombre] = useState(usuario?.nombre ?? '')
  const [email, setEmail] = useState(usuario?.email ?? '')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState(usuario?.rol_id ?? roles[0]?.id ?? 1)
  const [estado, setEstado] = useState(usuario?.estado ?? 'Activo')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !email.trim() || (!usuario && !password.trim())) return

    const payload: Partial<UsuarioCreate> = { nombre: nombre.trim(), email: email.trim(), rol_id: rolId, estado }
    if (!usuario) {
      ;(payload as UsuarioCreate).password = password
    } else if (password.trim()) {
      payload.password = password
    }
    onSubmit(payload)
  }

  return (
    <SlidePanel open onClose={onClose} title={usuario ? 'Editar Usuario' : 'Nuevo Usuario'} mode="split">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">
            {usuario ? 'Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required={!usuario}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Rol</label>
          <select
            value={rolId}
            onChange={e => setRolId(Number(e.target.value))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Estado</label>
          <select
            value={estado}
            onChange={e => setEstado(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isMutating}
            className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {isMutating ? 'Guardando…' : usuario ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}
