import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Filter,
  Plus,
  Check,
  Pencil,
  Trash2,
  X,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  MoreHorizontal,
  CalendarPlus,
  CalendarDays,
  Download,
  Building2,
  Briefcase,
} from 'lucide-react'
import {
  getSeguimientos,
  createSeguimiento,
  updateSeguimiento,
  deleteSeguimiento,
  downloadIcsUrl,
} from '../api/crmApi'
import type { Seguimiento, SeguimientoTipo, SeguimientoEstado } from '../api/types'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { CommonCard } from '../components/CommonCard'
import { SlidePanel } from '../components/SlidePanel'
import type { TagItem, MenuItem } from '../components/CommonCard'

const TIPO_OPTIONS: { value: string; label: string; icon: typeof Phone }[] = [
  { value: '', label: 'Todos', icon: MoreHorizontal },
  { value: 'Llamada', label: 'Llamada', icon: Phone },
  { value: 'Correo', label: 'Correo', icon: Mail },
  { value: 'Reunion', label: 'Reunión', icon: Calendar },
  { value: 'Nota', label: 'Nota', icon: MessageSquare },
  { value: 'Otro', label: 'Otro', icon: MoreHorizontal },
]

const ESTADO_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Completado', label: 'Completado' },
  { value: 'Cancelado', label: 'Cancelado' },
]

function tipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case 'Llamada': return 'bg-green-500/20 text-green-400'
    case 'Correo': return 'bg-blue-500/20 text-blue-400'
    case 'Reunion': return 'bg-purple-500/20 text-purple-400'
    case 'Nota': return 'bg-slate-600 text-slate-300'
    default: return 'bg-slate-600 text-slate-300'
  }
}

function estadoBadgeClass(estado: string): string {
  switch (estado) {
    case 'Pendiente': return 'bg-amber-500/20 text-amber-400'
    case 'Completado': return 'bg-emerald-500/20 text-emerald-400'
    case 'Cancelado': return 'bg-red-500/20 text-red-400'
    default: return 'bg-slate-600 text-slate-300'
  }
}

function formatDate(dateStr: string): string {
  // Backend may return ISO string ("2026-06-26T00:00:00.000000Z") or
  // plain date ("2026-06-26"). Normalize before passing to Date.
  const normalized = dateStr.slice(0, 10)
  return new Date(normalized + 'T00:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

interface FiltersState {
  search: string
  tipo: string
  estado: string
  fecha_desde: string
  fecha_hasta: string
}

const EMPTY_FILTERS: FiltersState = {
  search: '',
  tipo: '',
  estado: '',
  fecha_desde: '',
  fecha_hasta: '',
}

export function SeguimientosPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS)
  // Local input state for debounced search (does NOT trigger query per keystroke)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 1000)
  // Sync debounced value to filters (one-way: debounced → filters)
  if (debouncedSearch !== filters.search) {
    setFilters(prev => (prev.search === debouncedSearch ? prev : { ...prev, search: debouncedSearch }))
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSeguimiento, setEditingSeguimiento] = useState<Seguimiento | null>(null)
  const [viewingSeguimiento, setViewingSeguimiento] = useState<Seguimiento | null>(null)

  // Fetch seguimientos with filters
  const { data: seguimientosData, isLoading } = useQuery({
    queryKey: ['seguimientos', filters],
    queryFn: () => getSeguimientos({
      tipo: filters.tipo || undefined,
      estado: filters.estado || undefined,
      fecha_desde: filters.fecha_desde || undefined,
      fecha_hasta: filters.fecha_hasta || undefined,
      per_page: 50,
    }),
    placeholderData: (prev) => prev, // Keep previous data while fetching
  })

  const allSeguimientos = seguimientosData?.data?.data ?? []

  // Server filters by tipo/estado/fechas; the search input is debounced and
  // sent as the `search` field. If the backend ignores search, fall back to
  // client-side matching on notas.
  const filteredBySearch = filters.search
    ? allSeguimientos.filter(s => {
        const q = filters.search.toLowerCase()
        return (
          s.notas?.toLowerCase().includes(q) ||
          s.entidad_nombre?.toLowerCase().includes(q) ||
          s.oportunidad_codigo?.toLowerCase().includes(q) ||
          s.contacto_nombre?.toLowerCase().includes(q)
        )
      })
    : allSeguimientos

  // Group by estado for the cards view (Pendiente → Agendado → Completado → Cancelado).
  // "Agendado" = Pendiente with fecha > today.
  const today = new Date().toISOString().slice(0, 10)
  const grouped = {
    Agendado: filteredBySearch.filter(s => s.estado === 'Pendiente' && s.fecha > today),
    Pendiente: filteredBySearch.filter(s => s.estado === 'Pendiente' && s.fecha <= today),
    Completado: filteredBySearch.filter(s => s.estado === 'Completado'),
    Cancelado: filteredBySearch.filter(s => s.estado === 'Cancelado'),
  }

  // Stats (counts over the full list, not the search-filtered subset)
  const stats = {
    pendientes: allSeguimientos.filter(s => s.estado === 'Pendiente').length,
    completados: allSeguimientos.filter(s => s.estado === 'Completado').length,
    total: allSeguimientos.length,
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createSeguimiento>[0]) => createSeguimiento(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguimientos'] })
      setShowCreateModal(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<{ tipo: string; notas: string; fecha: string; hora: string; estado: string }> }) =>
      updateSeguimiento(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguimientos'] })
      setEditingSeguimiento(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSeguimiento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguimientos'] })
    },
  })

  function handleCompletar(id: number) {
    if (!confirm('¿Marcar este seguimiento como completado?')) return
    updateMutation.mutate({ id, payload: { estado: 'Completado' } })
  }

  function handleEliminar(id: number) {
    if (!confirm('¿Eliminar este seguimiento? Esta acción no se puede deshacer.')) return
    deleteMutation.mutate(id)
  }

  function hasActiveFilters(): boolean {
    return (
      filters.tipo !== '' ||
      filters.estado !== '' ||
      filters.fecha_desde !== '' ||
      filters.fecha_hasta !== '' ||
      filters.search !== ''
    )
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
  }

  return (
    <div className="relative space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Seguimientos</h1>
          <p className="text-slate-400">Gestión de llamadas, correos, reuniones y notas</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/seguimientos/calendario"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-colors border border-slate-700"
          >
            <CalendarDays size={18} />
            Ver calendario
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} />
            Nuevo Seguimiento
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Pendientes</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pendientes}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Completados</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.completados}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <p className="text-sm text-slate-400">Totales</p>
          <p className="text-2xl font-bold text-slate-200">{stats.total}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
          {hasActiveFilters() && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search — debounced 1s via useDebouncedValue; this input is local */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar en notas, empresa, oportunidad..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Tipo */}
          <select
            value={filters.tipo}
            onChange={e => setFilters(f => ({ ...f, tipo: e.target.value }))}
            className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          >
            {TIPO_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={filters.estado}
            onChange={e => setFilters(f => ({ ...f, estado: e.target.value }))}
            className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          >
            {ESTADO_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Fecha desde */}
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={e => setFilters(f => ({ ...f, fecha_desde: e.target.value }))}
            className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />

          {/* Fecha hasta */}
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={e => setFilters(f => ({ ...f, fecha_hasta: e.target.value }))}
            className="px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Seguimientos List — T-FE-08: cards grouped by estado (Agendado / Pendiente / Completado / Cancelado) */}
      <div className="space-y-6">
        {isLoading ? (
          // Loading skeletons (no full page unmount)
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-6 bg-slate-700 rounded-lg" />
                  <div className="w-24 h-4 bg-slate-700 rounded" />
                  <div className="flex-1 h-4 bg-slate-700 rounded" />
                  <div className="w-20 h-6 bg-slate-700 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredBySearch.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <Calendar size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-lg font-medium">No se encontraron seguimientos</p>
            <p className="text-slate-500 text-sm mt-1">
              {hasActiveFilters()
                ? 'Probá ajustando los filtros'
                : 'Creá un nuevo seguimiento para comenzar'}
            </p>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="mt-3 text-teal-400 hover:text-teal-300 text-sm"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            {(['Agendado', 'Pendiente', 'Completado', 'Cancelado'] as const).map((estadoGroup) => {
              const items = grouped[estadoGroup]
              if (items.length === 0) return null
              return (
                <section key={estadoGroup}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className={`text-sm font-semibold uppercase tracking-wide ${
                      estadoGroup === 'Agendado' ? 'text-cyan-400' :
                      estadoGroup === 'Pendiente' ? 'text-amber-400' :
                      estadoGroup === 'Completado' ? 'text-emerald-400' :
                      'text-red-400'
                    }`}>
                      {estadoGroup === 'Agendado' && <CalendarPlus size={14} className="inline mr-1.5" />}
                      {estadoGroup} ({items.length})
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {items.map((s) => (
                      <SeguimientoRow
                        key={s.id}
                        seguimiento={s}
                        onCompletar={() => handleCompletar(s.id)}
                        onEdit={() => setEditingSeguimiento(s)}
                        onDelete={() => handleEliminar(s.id)}
                        onView={() => setViewingSeguimiento(s)}
                        isCompleting={updateMutation.isPending}
                        isDeleting={deleteMutation.isPending}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}
      </div>

      {/* Detail SlidePanel */}
      {viewingSeguimiento && (
        <SlidePanel open onClose={() => setViewingSeguimiento(null)} title="Detalle de Seguimiento">
          <div className="space-y-6">
            {/* Header info */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                viewingSeguimiento.estado === 'Completado' ? 'bg-emerald-900/60 text-emerald-400' :
                viewingSeguimiento.estado === 'Cancelado' ? 'bg-red-900/60 text-red-400' :
                'bg-amber-900/60 text-amber-400'
              }`}>
                {viewingSeguimiento.tipo === 'Llamada' ? <Phone size={20} /> :
                 viewingSeguimiento.tipo === 'Correo' ? <Mail size={20} /> :
                 viewingSeguimiento.tipo === 'Reunion' ? <Calendar size={20} /> :
                 <MessageSquare size={20} />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-200">
                  {viewingSeguimiento.entidad_nombre || viewingSeguimiento.contacto_nombre || `Seguimiento #${viewingSeguimiento.id}`}
                </h2>
                <p className="text-sm text-slate-400">
                  {viewingSeguimiento.tipo} · {formatDate(viewingSeguimiento.fecha)}
                  {viewingSeguimiento.hora && <span> {viewingSeguimiento.hora}</span>}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { setViewingSeguimiento(null); setEditingSeguimiento(viewingSeguimiento) }}
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                  title="Editar"
                >
                  <Pencil size={15} />
                </button>
                <a
                  href={downloadIcsUrl(viewingSeguimiento.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-400 hover:text-teal-400"
                  title="Exportar .ics"
                >
                  <Download size={15} />
                </a>
              </div>
            </div>

            {/* Estado badge */}
            <div>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${estadoBadgeClass(viewingSeguimiento.estado)}`}>
                {viewingSeguimiento.estado}
              </span>
            </div>

            {/* Info grid */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
              {viewingSeguimiento.entidad_nombre && (
                <div className="flex items-center gap-2 text-sm">
                  <Building2 size={14} className="text-slate-500 shrink-0" />
                  <span className="text-slate-400">Entidad:</span>
                  <span className="text-slate-200">{viewingSeguimiento.entidad_nombre}</span>
                </div>
              )}
              {viewingSeguimiento.contacto_nombre && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone size={14} className="text-slate-500 shrink-0" />
                  <span className="text-slate-400">Contacto:</span>
                  <span className="text-slate-200">{viewingSeguimiento.contacto_nombre}</span>
                </div>
              )}
              {viewingSeguimiento.oportunidad_codigo && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase size={14} className="text-slate-500 shrink-0" />
                  <span className="text-slate-400">Oportunidad:</span>
                  <span className="text-slate-200">{viewingSeguimiento.oportunidad_codigo}</span>
                </div>
              )}
              {viewingSeguimiento.autor_nombre && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Creado por:</span>
                  <span className="text-slate-200">{viewingSeguimiento.autor_nombre}</span>
                </div>
              )}
            </div>

            {/* Notas */}
            {viewingSeguimiento.notas && (
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Notas</label>
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{viewingSeguimiento.notas}</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {viewingSeguimiento.estado === 'Pendiente' && (
                <button
                  onClick={() => { handleCompletar(viewingSeguimiento.id); setViewingSeguimiento(null) }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors"
                >
                  <Check size={16} />
                  Marcar Completado
                </button>
              )}
              <button
                onClick={() => { handleEliminar(viewingSeguimiento.id); setViewingSeguimiento(null) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 font-medium rounded-xl transition-colors"
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        </SlidePanel>
      )}

      {/* Create SlidePanel */}
      {showCreateModal && (
        <SlidePanel open onClose={() => setShowCreateModal(false)} title="Nuevo Seguimiento">
          <CreateSeguimientoForm
            onSubmit={(payload) => createMutation.mutate(payload)}
            onClose={() => setShowCreateModal(false)}
            isSubmitting={createMutation.isPending}
          />
        </SlidePanel>
      )}

      {/* Edit SlidePanel */}
      {editingSeguimiento && (
        <SlidePanel open onClose={() => setEditingSeguimiento(null)} title="Editar Seguimiento">
          <EditSeguimientoForm
            seguimiento={editingSeguimiento}
            onSubmit={(payload) => updateMutation.mutate({ id: editingSeguimiento.id, payload })}
            onClose={() => setEditingSeguimiento(null)}
            isSubmitting={updateMutation.isPending}
          />
        </SlidePanel>
      )}
    </div>
  )
}

/* ── Seguimiento Card Component ─────────────────── */

function SeguimientoRow({
  seguimiento,
  onCompletar,
  onEdit,
  onDelete,
  onView,
  isCompleting,
  isDeleting,
}: {
  seguimiento: Seguimiento
  onCompletar: () => void
  onEdit: () => void
  onDelete: () => void
  onView: () => void
  isCompleting: boolean
  isDeleting: boolean
}) {
  const menuItems: MenuItem[] = [
    ...(seguimiento.estado === 'Pendiente'
      ? [{ icon: <Check size={14} />, label: 'Completar', onClick: onCompletar }]
      : []),
    { icon: <Download size={14} />, label: 'Exportar .ics', onClick: () => window.open(downloadIcsUrl(seguimiento.id), '_blank') },
    { icon: <Pencil size={14} />, label: 'Editar', onClick: onEdit },
    { icon: <Trash2 size={14} />, label: 'Eliminar', onClick: onDelete, danger: true },
  ]

  const isAgendado = seguimiento.estado === 'Pendiente' && seguimiento.fecha > new Date().toISOString().slice(0, 10)
  const estadoVariant = seguimiento.estado === 'Completado' ? 'emerald' : seguimiento.estado === 'Cancelado' ? 'red' : isAgendado ? 'blue' : 'amber'

  const tags: TagItem[] = [
    { label: seguimiento.estado, variant: estadoVariant },
    { label: seguimiento.tipo, variant: 'slate' },
  ]

  const tipoIconMap: Record<string, React.ReactNode> = {
    Llamada: <Phone size={12} />,
    Correo: <Mail size={12} />,
    Reunion: <Calendar size={12} />,
    Nota: <MessageSquare size={12} />,
    Otro: <MoreHorizontal size={12} />,
  }

  return (
    <CommonCard
      title={seguimiento.entidad_nombre || seguimiento.contacto_nombre || `Seguimiento #${seguimiento.id}`}
      subtitle={`${seguimiento.tipo} · ${formatDate(seguimiento.fecha)}${seguimiento.hora ? ' ' + seguimiento.hora : ''}`}
      avatarText={seguimiento.entidad_nombre?.[0] || seguimiento.contacto_nombre?.[0] || 'S'}
      avatarColor={
        seguimiento.estado === 'Completado' ? 'bg-emerald-900/60 text-emerald-400' :
        seguimiento.estado === 'Cancelado' ? 'bg-red-900/60 text-red-400' :
        'bg-amber-900/60 text-amber-400'
      }
      info1={seguimiento.oportunidad_codigo ? { icon: <Briefcase size={12} />, text: seguimiento.oportunidad_codigo } : undefined}
      info2={seguimiento.notas ? { icon: tipoIconMap[seguimiento.tipo], text: seguimiento.notas } : undefined}
      tags={tags}
      menuItems={menuItems}
      onClick={onView}
    />
  )
}

/* ── Create Seguimiento Form (inside SlidePanel) ── */

function CreateSeguimientoForm({
  onClose,
  onSubmit,
  isSubmitting,
}: {
  onClose: () => void
  onSubmit: (payload: { tipo: string; notas?: string; fecha?: string; hora?: string; estado?: string; oportunidad_id?: number; contacto_id?: number; entidad_id?: number }) => void
  isSubmitting: boolean
}) {
  const [tipo, setTipo] = useState<SeguimientoTipo>('Llamada')
  const [notas, setNotas] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [hora, setHora] = useState('')
  const [estado, setEstado] = useState<SeguimientoEstado>('Pendiente')
  const [entidadId, setEntidadId] = useState<number | undefined>(undefined)
  const [contactoId, setContactoId] = useState<number | undefined>(undefined)
  const [oportunidadId, setOportunidadId] = useState<number | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notas.trim()) {
      setError('Las notas son obligatorias.')
      return
    }
    onSubmit({
      tipo,
      notas: notas.trim(),
      fecha: fecha || undefined,
      hora: hora || undefined,
      estado,
      entidad_id: entidadId,
      contacto_id: contactoId,
      oportunidad_id: oportunidadId,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Tipo */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Tipo</label>
        <div className="grid grid-cols-4 gap-2">
          {([
            { value: 'Llamada' as const, label: 'Llamada', icon: Phone },
            { value: 'Correo' as const, label: 'Correo', icon: Mail },
            { value: 'Reunion' as const, label: 'Reunión', icon: Calendar },
            { value: 'Nota' as const, label: 'Nota', icon: MessageSquare },
          ]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                tipo === value
                  ? 'bg-teal-700 border-teal-500 text-teal-300'
                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entidad + Contacto + Oportunidad */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Entidad ID</label>
          <input
            type="number"
            value={entidadId ?? ''}
            onChange={e => setEntidadId(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="ID entidad"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Contacto ID</label>
          <input
            type="number"
            value={contactoId ?? ''}
            onChange={e => setContactoId(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="ID contacto"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Oportunidad ID</label>
          <input
            type="number"
            value={oportunidadId ?? ''}
            onChange={e => setOportunidadId(e.target.value ? Number(e.target.value) : undefined)}
            placeholder="ID oportunidad"
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Fecha + Hora */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Hora</label>
          <input
            type="time"
            value={hora}
            onChange={e => setHora(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">
          Notas <span className="text-red-400">*</span>
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          required
          rows={4}
          placeholder="Detalle de la interacción..."
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
        >
          {isSubmitting ? 'Guardando...' : 'Crear Seguimiento'}
        </button>
      </div>
    </form>
  )
}

/* ── Edit Seguimiento Form (inside SlidePanel) ─── */

function EditSeguimientoForm({
  seguimiento,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  seguimiento: Seguimiento
  onClose: () => void
  onSubmit: (payload: Partial<{ tipo: string; notas: string; fecha: string; hora: string; estado: string; oportunidad_id?: number; contacto_id?: number; entidad_id?: number }>) => void
  isSubmitting: boolean
}) {
  const [tipo, setTipo] = useState<SeguimientoTipo>(seguimiento.tipo)
  const [notas, setNotas] = useState(seguimiento.notas ?? '')
  // Backend returns ISO string (e.g. "2026-06-26T00:00:00.000000Z");
  // input[type=date] requires yyyy-MM-dd only.
  const [fecha, setFecha] = useState(seguimiento.fecha.slice(0, 10))
  const [hora, setHora] = useState(seguimiento.hora ?? '')
  const [estado, setEstado] = useState<SeguimientoEstado>(seguimiento.estado)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notas.trim()) {
      setError('Las notas son obligatorias.')
      return
    }
    onSubmit({
      tipo,
      notas: notas.trim(),
      fecha,
      hora: hora || undefined,
      estado,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {/* Info de relaciones (read-only) */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3 space-y-2 text-sm">
        {seguimiento.entidad_nombre && (
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-500 shrink-0" />
            <span className="text-slate-400">Entidad:</span>
            <span className="text-slate-200">{seguimiento.entidad_nombre}</span>
          </div>
        )}
        {seguimiento.contacto_nombre && (
          <div className="flex items-center gap-2">
            <Phone size={14} className="text-slate-500 shrink-0" />
            <span className="text-slate-400">Contacto:</span>
            <span className="text-slate-200">{seguimiento.contacto_nombre}</span>
          </div>
        )}
        {seguimiento.oportunidad_codigo && (
          <div className="flex items-center gap-2">
            <Briefcase size={14} className="text-slate-500 shrink-0" />
            <span className="text-slate-400">Oportunidad:</span>
            <span className="text-slate-200">{seguimiento.oportunidad_codigo}</span>
          </div>
        )}
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-sm text-slate-400 mb-2">Tipo</label>
        <div className="grid grid-cols-4 gap-2">
          {([
            { value: 'Llamada' as const, label: 'Llamada', icon: Phone },
            { value: 'Correo' as const, label: 'Correo', icon: Mail },
            { value: 'Reunion' as const, label: 'Reunión', icon: Calendar },
            { value: 'Nota' as const, label: 'Nota', icon: MessageSquare },
          ]).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipo(value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                tipo === value
                  ? 'bg-teal-700 border-teal-500 text-teal-300'
                  : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Icon size={18} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">
          Notas <span className="text-red-400">*</span>
        </label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          required
          rows={4}
          placeholder="Detalle de la interacción..."
          className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none text-sm"
        />
      </div>

      {/* Fecha + Hora */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">Hora</label>
          <input
            type="time"
            value={hora}
            onChange={e => setHora(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Estado */}
      <div>
        <label className="block text-sm text-slate-400 mb-1.5">Estado</label>
        <select
          value={estado}
          onChange={e => setEstado(e.target.value as SeguimientoEstado)}
          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
        >
          <option value="Pendiente">Pendiente</option>
          <option value="Completado">Completado</option>
          <option value="Cancelado">Cancelado</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
        >
          {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </form>
  )
}
