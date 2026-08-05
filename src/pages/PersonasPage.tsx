import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserCircle, Search, Plus, Pencil, Trash2, Mail, Phone, MapPin } from 'lucide-react'
import { getPersonas, createPersona, updatePersona, deletePersona } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import type { Persona, PersonaCreate } from '../api/types'

const IDENTIFICACION_TIPOS = ['CC', 'NIT', 'CE', 'TI', 'PP', 'PEP']

function PersonaForm({ initialData, onClose }: { initialData?: Persona; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const [form, setForm] = useState<PersonaCreate>({
    identificacion_tipo: initialData?.identificacion_tipo ?? null,
    identificacion_numero: initialData?.identificacion_numero ?? null,
    nombres: initialData?.nombres ?? '',
    apellidos: initialData?.apellidos ?? null,
    email_principal: initialData?.email_principal ?? null,
    telefono_principal: initialData?.telefono_principal ?? null,
    direccion: initialData?.direccion ?? null,
    ciudad: initialData?.ciudad ?? null,
    pais: initialData?.pais ?? null,
  })

  const mutation = useMutation({
    mutationFn: (data: PersonaCreate) =>
      isEdit
        ? updatePersona(initialData!.id, data)
        : createPersona(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
      showToast(isEdit ? 'Persona actualizada' : 'Persona creada', 'success')
      onClose()
    },
    onError: () => {
      showToast('Error al guardar la persona', 'error')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  function update<K extends keyof PersonaCreate>(key: K, value: PersonaCreate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <h2 className="text-lg font-bold text-slate-50">
        {isEdit ? 'Editar Persona' : 'Nueva Persona'}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tipo ID</label>
          <select
            value={form.identificacion_tipo ?? ''}
            onChange={(e) => update('identificacion_tipo', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">—</option>
            {IDENTIFICACION_TIPOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Número ID</label>
          <input
            type="text"
            value={form.identificacion_numero ?? ''}
            onChange={(e) => update('identificacion_numero', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Nombres *</label>
          <input
            type="text"
            value={form.nombres}
            onChange={(e) => update('nombres', e.target.value)}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Apellidos</label>
          <input
            type="text"
            value={form.apellidos ?? ''}
            onChange={(e) => update('apellidos', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Email principal</label>
          <input
            type="email"
            value={form.email_principal ?? ''}
            onChange={(e) => update('email_principal', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
          <input
            type="text"
            value={form.telefono_principal ?? ''}
            onChange={(e) => update('telefono_principal', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Dirección</label>
        <input
          type="text"
          value={form.direccion ?? ''}
          onChange={(e) => update('direccion', e.target.value || null)}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Ciudad</label>
          <input
            type="text"
            value={form.ciudad ?? ''}
            onChange={(e) => update('ciudad', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">País</label>
          <input
            type="text"
            value={form.pais ?? ''}
            onChange={(e) => update('pais', e.target.value || null)}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-700">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  )
}

export function PersonasPage() {
  const { user } = useAuth()
  const canEdit = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin'

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [personToDelete, setPersonToDelete] = useState<Persona | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['personas', search, page],
    queryFn: () => getPersonas({ search: search || undefined, per_page: 25, page }),
  })

  const personas: Persona[] = data?.data?.data ?? []
  const totalPages = data?.data?.last_page ?? 1
  const total = data?.data?.total ?? 0

  function handleNew() {
    setSelectedPersona(null)
    setFormOpen(true)
  }

  function handleEdit(p: Persona) {
    setSelectedPersona(p)
    setFormOpen(true)
  }

  async function handleConfirmDelete() {
    if (!personToDelete) return
    try {
      await deletePersona(personToDelete.id)
      queryClient.invalidateQueries({ queryKey: ['personas'] })
      showToast(`Persona ${personToDelete.nombre_completo ?? personToDelete.nombres} eliminada`, 'success')
      setPersonToDelete(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar'
      showToast(msg, 'error')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Personas</h1>
          <p className="text-slate-400">Personas físicas (Party Model) — base para múltiples contactos y entidades</p>
        </div>
        {canEdit && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Nueva Persona
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Buscar por nombre, apellido, email, identificación o teléfono..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="text-sm text-slate-400">
        {isLoading ? 'Cargando...' : `${total} persona${total === 1 ? '' : 's'}`}
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Persona</th>
              <th className="text-left px-4 py-3">Identificación</th>
              <th className="text-left px-4 py-3">Contacto</th>
              <th className="text-left px-4 py-3">Ubicación</th>
              {canEdit && <th className="text-right px-4 py-3 w-24">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {personas.map((p) => (
              <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                      <UserCircle size={16} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-slate-200 font-medium">{p.nombre_completo || p.nombres}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">
                  {p.identificacion_tipo ? (
                    <span>{p.identificacion_tipo} {p.identificacion_numero}</span>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs space-y-0.5">
                  {p.email_principal && (
                    <div className="flex items-center gap-1.5"><Mail size={11} className="text-slate-500" />{p.email_principal}</div>
                  )}
                  {p.telefono_principal && (
                    <div className="flex items-center gap-1.5"><Phone size={11} className="text-slate-500" />{p.telefono_principal}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">
                  {p.ciudad || p.pais ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-slate-500 shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {[p.direccion, p.ciudad, p.pais].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-slate-700 rounded transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setPersonToDelete(p)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && personas.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="px-4 py-12 text-center text-slate-500">
                  Sin personas registradas. {canEdit && 'Hacé clic en "Nueva Persona" para empezar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <SlidePanel open={formOpen} onClose={() => setFormOpen(false)} title={selectedPersona ? 'Editar Persona' : 'Nueva Persona'}>
        <PersonaForm
          initialData={selectedPersona ?? undefined}
          onClose={() => setFormOpen(false)}
        />
      </SlidePanel>

      <ConfirmModal
        open={!!personToDelete}
        variant="danger"
        title="Eliminar persona"
        message={
          personToDelete ? (
            <>
              ¿Eliminar a <strong className="text-slate-100">{personToDelete.nombre_completo ?? personToDelete.nombres}</strong>?
              <br />
              <span className="text-slate-400 text-xs">
                Esta acción mueve la persona a la papelera. Los contactos asociados no se verán afectados.
              </span>
            </>
          ) : null
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPersonToDelete(null)}
      />
    </div>
  )
}
