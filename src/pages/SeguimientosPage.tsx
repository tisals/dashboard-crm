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
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', {
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

  // Stats
  const stats = {
    pendientes: seguimientos.filter(s => s.estado === 'Pendiente').length,
    completados: seguimientos.filter(s => s.estado === 'Completado').length,
    total: seguimientos.length,
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateSeguimientoModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingSeguimiento && (
        <EditSeguimientoModal
          seguimiento={editingSeguimiento}
          onClose={() => setEditingSeguimiento(null)}
          onSubmit={(payload) => updateMutation.mutate({ id: editingSeguimiento.id, payload })}
          isSubmitting={updateMutation.isPending}
        />
      )}
    </div>
  )
}

/* ── Seguimiento Row Component ──────────────────── */

function SeguimientoRow({
  seguimiento,
  onCompletar,
  onEdit,
  onDelete,
  isCompleting,
  isDeleting,
}: {
  seguimiento: Seguimiento
  onCompletar: () => void
  onEdit: () => void
  onDelete: () => void
  isCompleting: boolean
  isDeleting: boolean
}) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-slate-600 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tipo + Fecha */}
        <div className="flex items-center gap-3 sm:w-56 shrink-0">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${tipoBadgeClass(seguimiento.tipo)}`}>
            {seguimiento.tipo}
          </span>
          <span className="text-sm text-slate-400 whitespace-nowrap">
            {formatDate(seguimiento.fecha)}
            {seguimiento.hora && <span className="ml-1 text-slate-500">{seguimiento.hora}</span>}
          </span>
        </div>

        {/* Notas */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 line-clamp-2">
            {seguimiento.notas || <span className="text-slate-500 italic">Sin notas</span>}
          </p>
          {/* Related entity info */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
            {seguimiento.entidad_nombre && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                {seguimiento.entidad_nombre}
              </span>
            )}
            {seguimiento.contacto_nombre && (
              <span>{seguimiento.contacto_nombre}</span>
            )}
            {seguimiento.oportunidad_codigo && (
              <span className="text-amber-500/70">{seguimiento.oportunidad_codigo}</span>
            )}
          </div>
        </div>

        {/* Estado + Actions */}
        <div className="flex items-center gap-2 sm:justify-end shrink-0">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${estadoBadgeClass(seguimiento.estado)}`}>
            {seguimiento.estado}
          </span>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            {seguimiento.estado === 'Pendiente' && (
              <button
                onClick={onCompletar}
                disabled={isCompleting}
                title="Marcar como completado"
                className="p-1.5 rounded-lg hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50"
              >
                <Check size={16} />
              </button>
            )}
            {/* T-FE-09: ICS export button — opens the .ics file for Outlook/Google Calendar */}
            <a
              href={downloadIcsUrl(seguimiento.id)}
              target="_blank"
              rel="noopener noreferrer"
              title="Exportar a calendario (.ics)"
              className="p-1.5 rounded-lg hover:bg-teal-500/20 text-slate-400 hover:text-teal-400 transition-colors"
            >
              <Download size={16} />
            </a>
            <button
              onClick={onEdit}
              title="Editar"
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              title="Eliminar"
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Create Seguimiento Modal ──────────────────── */

function CreateSeguimientoModal({
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
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [estado, setEstado] = useState<SeguimientoEstado>('Pendiente')
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
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Nuevo Seguimiento</h2>
            <p className="text-sm text-slate-400">Registrar una nueva interacción</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              rows={3}
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
              {isSubmitting ? 'Guardando...' : 'Crear Seguimiento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Edit Seguimiento Modal ────────────────────── */

function EditSeguimientoModal({
  seguimiento,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  seguimiento: Seguimiento
  onClose: () => void
  onSubmit: (payload: Partial<{ tipo: string; notas: string; fecha: string; hora: string; estado: string }>) => void
  isSubmitting: boolean
}) {
  const [tipo, setTipo] = useState<SeguimientoTipo>(seguimiento.tipo)
  const [notas, setNotas] = useState(seguimiento.notas ?? '')
  const [fecha, setFecha] = useState(seguimiento.fecha)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Editar Seguimiento</h2>
            <p className="text-sm text-slate-400">{seguimiento.tipo} — {formatDate(seguimiento.fecha)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              rows={3}
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
      </div>
    </div>
  )
}
