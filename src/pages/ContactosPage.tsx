import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { Search, Users, Plus, Pencil, Trash2, Building2, X, UserPlus, ChevronDown } from 'lucide-react'
import { getContactos, getEntidades, createContacto, updateContacto, deleteContacto } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'

interface Contacto {
  id: number
  entidad_id: number | null
  nombres: string
  apellidos: string
  area: string | null
  cargo: string | null
  tel_contacto: string | null
  movil: string | null
  email_contacto: string | null
  email_secundario: string | null
  rol: string | null
  etapa: string | null
  estado: string
  entidad_nombre?: string
}

interface Entidad {
  id: number
  nombre: string
  identificacion: string
}

export function ContactosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [entidadFilter, setEntidadFilter] = useState<number | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedContacto, setSelectedContacto] = useState<Contacto | null>(null)
  const [editMode, setEditMode] = useState(false)

  const { data: entidadesData } = useQuery({
    queryKey: ['entidades', 'list'],
    queryFn: () => getEntidades({ per_page: 500 }),
  })
  const entidades: Entidad[] = entidadesData?.data?.data ?? []

  const PER_PAGE = 50

  const {
    data: contactosPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['contactos', search, entidadFilter],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getContactos({
        search: search || undefined,
        entidad_id: entidadFilter ?? undefined,
        per_page: PER_PAGE,
        page: pageParam,
      })
      return res
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.data?.total ?? 0
      const loaded = allPages.length * PER_PAGE
      return loaded < total ? allPages.length + 1 : undefined
    },
  })
  const contactos: Contacto[] = contactosPages?.pages.flatMap(p => p.data?.data ?? []) ?? []
  const totalContactos = contactosPages?.pages[0]?.data?.total ?? 0

  const createMut = useMutation({
    mutationFn: createContacto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactos'], exact: false })
      setFormOpen(false)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Contacto> }) => updateContacto(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactos'], exact: false })
      setFormOpen(false)
      setDetailOpen(false)
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteContacto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contactos'], exact: false })
      setDetailOpen(false)
    },
  })

  function handleNew() { setSelectedContacto(null); setEditMode(false); setFormOpen(true) }
  function handleEdit(c: Contacto) { setSelectedContacto(c); setEditMode(true); setFormOpen(true) }
  function handleView(c: Contacto) { setSelectedContacto(c); setDetailOpen(true) }
  function handleDelete(c: Contacto) {
    if (confirm(`¿Eliminar a ${c.nombres} ${c.apellidos}?`)) deleteMut.mutate(c.id)
  }

  function getEntidadName(entidadId: number | null, entidadNombre?: string): string {
    if (entidadNombre) return entidadNombre
    if (!entidadId) return ''
    return entidades.find(e => e.id === entidadId)?.nombre ?? `Entidad #${entidadId}`
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Contactos</h1>
          <p className="text-slate-400">Gestión de contactos por entidad</p>
        </div>
        <button onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o cargo..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <select value={entidadFilter ?? ''} onChange={e => setEntidadFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500">
            <option value="">Todas las entidades</option>
            {entidades.map(ent => (<option key={ent.id} value={ent.id}>{ent.nombre}</option>))}
          </select>
        </div>
      </div>

      {/* 3-Column Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-slate-700 rounded" />
                  <div className="w-48 h-3 bg-slate-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : contactos.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <Users size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-lg font-medium">No se encontraron contactos</p>
          <p className="text-slate-500 text-sm mt-1">{search || entidadFilter ? 'Probá ajustando los filtros' : 'Creá el primer contacto'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contactos.map((c) => (
            <div key={c.id}
              className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors cursor-pointer group"
              onClick={() => handleView(c)}>
              {/* Avatar + Name */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-700/50 flex items-center justify-center text-teal-400 font-medium text-sm shrink-0">
                  {c.nombres.charAt(0)}{c.apellidos.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{c.nombres} {c.apellidos}</p>
                  {c.cargo && <p className="text-xs text-slate-500 truncate">{c.cargo}</p>}
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-1 text-xs text-slate-400">
                {c.email_contacto && <p className="truncate">{c.email_contacto}</p>}
                {c.movil && <p>{c.movil}</p>}
              </div>

              {/* Entity badge */}
              {c.entidad_id && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-lg flex items-center gap-1">
                    <Building2 size={11} />
                    <span className="truncate">{getEntidadName(c.entidad_id, c.entidad_nombre)}</span>
                  </span>
                </div>
              )}

              {/* Action buttons (visible on hover) */}
              <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(c) }}
                  className="p-1.5 text-slate-400 hover:text-yellow-400 rounded-lg hover:bg-slate-700 transition-colors" title="Editar">
                  <Pencil size={14} />
                </button>
                {!c.entidad_id && (
                  <button onClick={(e) => { e.stopPropagation(); handleEdit(c) }}
                    className="p-1.5 text-slate-400 hover:text-teal-400 rounded-lg hover:bg-slate-700 transition-colors" title="Asignar a entidad">
                    <UserPlus size={14} />
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); handleDelete(c) }}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition-colors" title="Eliminar">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cargar más */}
      {!isLoading && contactos.length > 0 && hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl border border-slate-600 text-sm font-medium transition-colors"
          >
            {isFetchingNextPage ? (
              'Cargando...'
            ) : (
              <>
                Cargar más
                <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      )}

      {!isLoading && (
        <p className="text-xs text-slate-500 text-center">
          {contactos.length} de {totalContactos} contacto{totalContactos !== 1 ? 's' : ''}
        </p>
      )}
      </div>

      {/* Form Panel */}
      <ContactoFormPanel
        open={formOpen} onClose={() => setFormOpen(false)}
        contacto={selectedContacto} entidades={entidades}
        onSubmit={(data) => {
          if (selectedContacto && editMode) updateMut.mutate({ id: selectedContacto.id, data })
          else createMut.mutate(data)
        }}
        isLoading={createMut.isPending || updateMut.isPending}
      />

      {/* Detail Panel */}
      {selectedContacto && (
        <ContactoDetailPanel
          open={detailOpen} onClose={() => setDetailOpen(false)}
          contacto={selectedContacto} entidades={entidades}
          onEdit={() => { setDetailOpen(false); handleEdit(selectedContacto) }}
        />
      )}
      </div>
  )
}
// ── Form Panel ───────────────────────────────────────────────────

function ContactoFormPanel({ open, onClose, contacto, entidades, onSubmit, isLoading }: {
  open: boolean; onClose: () => void; contacto: Contacto | null; entidades: Entidad[];
  onSubmit: (data: any) => void; isLoading: boolean
}) {
  const [form, setForm] = useState({
    nombres: '', apellidos: '', email_contacto: '', email_secundario: '',
    tel_contacto: '', movil: '', cargo: '', area: '', rol: '', etapa: '', entidad_id: '',
  })

  useState(() => {
    if (contacto) setForm({
      nombres: contacto.nombres, apellidos: contacto.apellidos,
      email_contacto: contacto.email_contacto ?? '', email_secundario: contacto.email_secundario ?? '',
      tel_contacto: contacto.tel_contacto ?? '', movil: contacto.movil ?? '',
      cargo: contacto.cargo ?? '', area: contacto.area ?? '',
      rol: contacto.rol ?? '', etapa: contacto.etapa ?? '',
      entidad_id: contacto.entidad_id?.toString() ?? '',
    })
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({ ...form, entidad_id: form.entidad_id ? Number(form.entidad_id) : null })
  }

  return (
    <SlidePanel open={open} onClose={onClose} title={contacto ? 'Editar Contacto' : 'Nuevo Contacto'} mode="split">
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nombres *</label>
            <input required value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Apellidos *</label>
            <input required value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Email *</label>
          <input required type="email" value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Teléfono</label>
            <input value={form.tel_contacto} onChange={e => setForm({ ...form, tel_contacto: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Móvil</label>
            <input value={form.movil} onChange={e => setForm({ ...form, movil: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Cargo</label>
            <input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Área</label>
            <input value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Entidad</label>
          <select value={form.entidad_id} onChange={e => setForm({ ...form, entidad_id: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500">
            <option value="">Sin entidad</option>
            {entidades.map(ent => (<option key={ent.id} value={ent.id}>{ent.nombre}</option>))}
          </select>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">Cancelar</button>
          <button type="submit" disabled={isLoading}
            className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
            {isLoading ? 'Guardando...' : contacto ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}

// ── Detail Panel (30% width) ─────────────────────────────────────

function ContactoDetailPanel({ open, onClose, contacto, entidades, onEdit }: {
  open: boolean; onClose: () => void; contacto: Contacto; entidades: Entidad[]; onEdit: () => void
}) {
  function getEntidadName(): string {
    if (contacto.entidad_nombre) return contacto.entidad_nombre
    if (!contacto.entidad_id) return 'Sin entidad'
    return entidades.find(e => e.id === contacto.entidad_id)?.nombre ?? 'Entidad #' + contacto.entidad_id
  }

  return (
    <SlidePanel open={open} onClose={onClose} title="Detalle de Contacto" mode="split">
      <div className="p-4 space-y-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-teal-700/50 flex items-center justify-center text-teal-400 font-bold text-xl">
            {contacto.nombres.charAt(0)}{contacto.apellidos.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{contacto.nombres} {contacto.apellidos}</h2>
            {contacto.cargo && <p className="text-sm text-slate-400">{contacto.cargo}{contacto.area ? ` · ${contacto.area}` : ''}</p>}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2 text-sm">
          {contacto.email_contacto && (
            <div className="flex items-center gap-2 text-slate-300 bg-slate-900 rounded-lg px-3 py-2">
              <span className="text-slate-500 text-xs w-20">Email</span>
              <span className="truncate">{contacto.email_contacto}</span>
            </div>
          )}
          {contacto.movil && (
            <div className="flex items-center gap-2 text-slate-300 bg-slate-900 rounded-lg px-3 py-2">
              <span className="text-slate-500 text-xs w-20">Móvil</span>
              <span>{contacto.movil}</span>
            </div>
          )}
          {contacto.tel_contacto && (
            <div className="flex items-center gap-2 text-slate-300 bg-slate-900 rounded-lg px-3 py-2">
              <span className="text-slate-500 text-xs w-20">Teléfono</span>
              <span>{contacto.tel_contacto}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-slate-300 bg-slate-900 rounded-lg px-3 py-2">
            <span className="text-slate-500 text-xs w-20">Entidad</span>
            <span className="truncate">{getEntidadName()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
            <Pencil size={14} /> Editar
          </button>
        </div>
      </div>
    </SlidePanel>
  )
}
