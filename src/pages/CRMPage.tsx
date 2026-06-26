import { useState, useMemo, useEffect, useCallback, useRef, memo } from 'react'
import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Search, X, Copy, Check, Phone, Mail, MessageSquare, Calendar, CalendarDays, CalendarPlus, ChevronDown, ChevronRight, Trash2, Pencil, FileText, ArrowRight } from 'lucide-react'
import { CommonCard } from '../components/CommonCard'
import {
  getOportunidades,
  updateOportunidadPipelineEtapa,
  createOportunidad,
  clonarOportunidad,
  ganarOportunidad,
  getEntidades,
  getOportunidad,
  getContactos,
  getSeguimientos,
  createSeguimiento,
  downloadMonthlyCalendarIcsUrl,
  aprobarCotizacion,
  updateOportunidad,
  getDetallesOportunidad,
  createDetalleOportunidad,
  updateDetalleOportunidad,
  getProductos,
  getMaestros,
  getEntidadUsuarios,
  deleteOportunidad,
  versionarOportunidad,
  bulkMoveOportunidades,
} from '../api/crmApi'
import { useAuth } from '../context/AuthContext'
import type { Oportunidad, OportunidadEstado, Entidad, DetalleOportunidadBackend, Producto, Maestro, Usuario, DetalleOportunidadCreate } from '../api/types'
import type { CRMLayoutContext } from './CRMLayout'
import { SeguimientoModal } from '../components/SeguimientoModal'
import { CotizacionEditor } from '../components/CotizacionEditor'
import { DetalleLineEditor, type LineaForm } from '../components/DetalleLineEditor'
import { ActionButtons } from '../components/ActionButtons'
import { SeguimientoTimeline } from '../components/SeguimientoTimeline'
import { SlidePanel } from '../components/SlidePanel'
import { SendQuoteModal } from '../components/SendQuoteModal'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

// ── Display mapping: maestros name → internal estado string ──


// ── Types ────────────────────────────────────────

type ColumnId = string

interface Column {
  id: ColumnId
  label: string
  color: string
}

// ── Estados desde maestros ──────────────────────────
function buildColumns(maestrosEstado: Maestro[]): Column[] {
  const internalEstados: OportunidadEstado[] = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Ganada', 'Perdida']
  const colors: Record<string, string> = {
    Borrador: 'bg-slate-600', Enviada: 'bg-blue-600', Aceptada: 'bg-purple-600',
    Rechazada: 'bg-red-600', Ganada: 'bg-emerald-600', Perdida: 'bg-gray-600',
  }
  // Construir mapa: nombreMaestro → estadoInterno
  const nameToInternal: Record<string, OportunidadEstado> = {}
  // Maestros con nombre directo (ej: "Borrador" → "Borrador")
  for (const est of internalEstados) {
    nameToInternal[est] = est
  }

  // Recorrer maestros reales y crear columnas
  const seen = new Set<OportunidadEstado>()
  const cols: Column[] = []
  for (const m of maestrosEstado) {
    const internal = nameToInternal[m.nombre]
    if (internal && !seen.has(internal)) {
      seen.add(internal)
      cols.push({
        id: internal,
        label: m.nombre,
        color: colors[internal] ?? 'bg-slate-600',
      })
    }
  }
  return cols
}

// ── Sortable Card ────────────────────────────────

function OportunidadCard({
  oportunidad,
  onClone,
  onVersionar,
  onGanar,
  onDelete,
  onClick,
  selected,
  onToggleSelect,
  onAddSeguimiento,
}: {
  oportunidad: Oportunidad
  onClone: (id: number) => void
  onVersionar: (id: number) => void
  onGanar: (id: number) => void
  onDelete?: (id: number) => void
  onClick?: () => void
  selected?: boolean
  onToggleSelect?: (id: number) => void
  onAddSeguimiento?: (oportunidadId: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: oportunidad.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const detallesArr = (oportunidad as any).detalles
  const refTags = Array.isArray(detallesArr)
    ? (Array.from(
        new Set(detallesArr.map((d: any) => d.producto?.referencia ?? '').filter(Boolean))
      ) as string[])
    : []

  const formattedValor = oportunidad.valor != null && oportunidad.valor > 0
    ? `$${Number(oportunidad.valor).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : 'Sin valor'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <div className="relative">
        {onToggleSelect && (
          <div
            className="absolute top-2 left-2 z-10"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={!!selected}
              onChange={() => onToggleSelect(oportunidad.id)}
              className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
          </div>
        )}
        <CommonCard
          onClick={onClick}
          title={oportunidad.codigo}
          subtitle={formattedValor}
          info1={{ text: oportunidad.entidad_nombre ?? `#${oportunidad.entidad_id}` }}
          info2={oportunidad.updated_at ? { text: new Date(oportunidad.updated_at).toLocaleDateString('es-ES') } : undefined}
          tags={refTags.slice(0, 3).map(tag => ({ label: tag, variant: 'slate' as const }))}
          // T-FE-12: + Seguimiento button visible on hover. Disabled if no contacto_id.
          actionSlot={
            onAddSeguimiento && oportunidad.contacto_id ? (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSeguimiento(oportunidad.id)
                }}
                title="Registrar seguimiento"
                className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-teal-500/30 text-slate-300 hover:text-teal-300 transition-colors"
              >
                <CalendarPlus size={14} />
              </button>
            ) : onAddSeguimiento ? (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                disabled
                title="Esta oportunidad no tiene contacto asignado"
                className="p-1.5 rounded-lg bg-slate-700/30 text-slate-600 cursor-not-allowed"
              >
                <CalendarPlus size={14} />
              </button>
            ) : undefined
          }
          menuItems={[
            ...(oportunidad.estado === 'Aceptada' ? [{
              icon: <Check size={14} />,
              label: 'Marcar ganada',
              onClick: () => onGanar(oportunidad.id)
            }] : []),
            ...(onAddSeguimiento && oportunidad.contacto_id ? [{
              icon: <CalendarPlus size={14} />,
              label: 'Nuevo seguimiento',
              onClick: () => onAddSeguimiento(oportunidad.id)
            }] : []),
            {
              icon: <Pencil size={14} />,
              label: 'Editar / Detalles',
              onClick: () => onClick?.()
            },
            {
              icon: <FileText size={14} />,
              label: 'Ver PDF',
              onClick: () => {
                const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
                const token = localStorage.getItem('auth_token')
                fetch(`${base}/oportunidades/${oportunidad.id}/pdf`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                })
                  .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob() })
                  .then(blob => { const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 10000) })
                  .catch(err => console.error('Error al descargar PDF:', err))
              }
            },
            {
              icon: <Copy size={14} />,
              label: 'Duplicar',
              onClick: () => onClone(oportunidad.id)
            },
            {
              icon: <Copy size={14} />,
              label: 'Nueva Versión',
              onClick: () => onVersionar(oportunidad.id)
            },
            ...(onDelete ? [{
              icon: <Trash2 size={14} />,
              label: 'Eliminar',
              onClick: () => onDelete(oportunidad.id),
              danger: true
            }] : [])
          ]}
        />
      </div>
    </div>
  )
}

// ── Kanban Column ────────────────────────────────

function KanbanColumn({
  column,
  oportunidades,
  onClone,
  onVersionar,
  onGanar,
  onDelete,
  onCardClick,
  selectedOppIds,
  onToggleSelect,
  onAddSeguimiento,
}: {
  column: Column
  oportunidades: Oportunidad[]
  onClone: (id: number) => void
  onVersionar: (id: number) => void
  onGanar: (id: number) => void
  onDelete?: (id: number) => void
  onCardClick?: (id: number) => void
  selectedOppIds?: Set<number>
  onToggleSelect?: (id: number) => void
  onAddSeguimiento?: (oportunidadId: number) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const totalMonto = oportunidades.reduce((sum, op) => sum + (Number(op.valor) || 0), 0)

  return (
    <div className="flex-shrink-0 w-72 min-w-[18rem]" ref={setNodeRef}>
      <div className={`px-3 py-2 rounded-t-xl ${column.color} text-white font-medium text-sm flex items-center justify-between`}>
        <span>{column.label}</span>
        <div className="flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded-full text-xs">
          <span>{oportunidades.length}</span>
          {totalMonto > 0 && (
            <>
              <span>·</span>
              <span>${totalMonto.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </>
          )}
        </div>
      </div>
      <SortableContext
        items={oportunidades.map(o => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="bg-slate-800 rounded-b-xl p-3 min-h-64 space-y-2">
          {oportunidades.map(op => (
            <OportunidadCard
              key={op.id}
              oportunidad={op}
              onClone={onClone}
              onVersionar={onVersionar}
              onGanar={onGanar}
              onDelete={onDelete}
              onClick={() => onCardClick?.(op.id)}
              selected={selectedOppIds?.has(op.id)}
              onToggleSelect={onToggleSelect}
              onAddSeguimiento={onAddSeguimiento}
            />
          ))}
          {oportunidades.length === 0 && (
            <p className="text-slate-600 text-xs text-center py-4">Sin oportunidades</p>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Filter Bar ──────────────────────────────────

interface FilterBarProps {
  filters: {
    search: string
    estado: string
    entidad_id: string
    producto_id: string
    fecha_desde: string
    fecha_hasta: string
    pipeline_id: string
  }
  onChange: (f: FilterBarProps['filters']) => void
  entidadName?: string
  productos?: Producto[]
  estadosOptions: Column[]
  inputSearch?: string
  onSearchChange?: (v: string) => void
}

const FilterBar = memo(function FilterBar({ filters, onChange, entidadName, productos, estadosOptions, inputSearch, onSearchChange }: FilterBarProps) {
  const [showEntidadSearch, setShowEntidadSearch] = useState(false)
  const [entidadSearch, setEntidadSearch] = useState('')
  const [entidadResults, setEntidadResults] = useState<Entidad[]>([])

  async function searchEntidad(q: string) {
    if (!q) { setEntidadResults([]); return }
    const res = await getEntidades({ search: q, per_page: 10 })
    setEntidadResults(res.data?.data ?? [])
  }

  function selectEntidad(ent: Entidad) {
    onChange({ ...filters, entidad_id: String(ent.id) })
    setShowEntidadSearch(false)
    setEntidadSearch('')
    setEntidadResults([])
  }

  function clearEntidad() {
    onChange({ ...filters, entidad_id: '' })
  }

  return (
    <div className="flex flex-wrap gap-3">
      {/* Search / Código */}
      <div className="relative flex-1 min-w-40">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" style={{ top: '50%' }} />
        <input
          type="text"
          placeholder="Buscar por código o cliente..."
          value={inputSearch ?? filters.search}
          onChange={e => {
            if (onSearchChange) onSearchChange(e.target.value)
            else onChange({ ...filters, search: e.target.value })
          }}
          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Estado */}
      <select
        value={filters.estado}
        onChange={e => onChange({ ...filters, estado: e.target.value })}
        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
      >
        <option value="">Todos los estados</option>
        {estadosOptions.map(col => (
          <option key={col.id} value={col.id}>{col.label}</option>
        ))}
      </select>

      {/* Entidad */}
      <div className="relative">
        <button
          onClick={() => setShowEntidadSearch(v => !v)}
          className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm text-left min-w-40 flex items-center justify-between gap-2"
        >
          <span className={filters.entidad_id && entidadName ? 'text-slate-200' : 'text-slate-500'}>
            {filters.entidad_id && entidadName ? entidadName : 'Todas las entidades'}
          </span>
          {filters.entidad_id && (
            <span onClick={e => { e.stopPropagation(); clearEntidad() }} className="text-slate-400 hover:text-slate-200">×</span>
          )}
        </button>
        {showEntidadSearch && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl p-3 w-72 shadow-xl">
            <input
              autoFocus
              type="text"
              placeholder="Buscar entidad..."
              value={entidadSearch}
              onChange={e => { setEntidadSearch(e.target.value); searchEntidad(e.target.value) }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 mb-2"
            />
            <div className="max-h-48 overflow-y-auto space-y-1">
              {entidadResults.map(ent => (
                <button
                  key={ent.id}
                  onClick={() => selectEntidad(ent)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-200 text-sm"
                >
                  <span className="font-medium">{ent.nombre}</span>
                  <span className="text-slate-400 ml-2 text-xs">{ent.identificacion}</span>
                </button>
              ))}
              {entidadSearch && entidadResults.length === 0 && (
                <p className="text-slate-500 text-xs px-3 py-2">Sin resultados</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Producto */}
      <select
        value={filters.producto_id}
        onChange={e => onChange({ ...filters, producto_id: e.target.value })}
        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
      >
        <option value="">Todos los productos</option>
        {(productos ?? []).map(p => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>

      {/* Fecha desde */}
      <input
        type="date"
        value={filters.fecha_desde}
        onChange={e => onChange({ ...filters, fecha_desde: e.target.value })}
        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Desde"
      />

      {/* Fecha hasta */}
      <input
        type="date"
        value={filters.fecha_hasta}
        onChange={e => onChange({ ...filters, fecha_hasta: e.target.value })}
        className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
        placeholder="Hasta"
      />
    </div>
  )
})

// ── Create Modal ────────────────────────────────

function NuevaOportunidadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [entidadId, setEntidadId] = useState<number | null>(null)
  const [entidadNombre, setEntidadNombre] = useState('')
  const [contactoId, setContactoId] = useState<number | undefined>(undefined)
  const [observaciones, setObservaciones] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entidadSearch, setEntidadSearch] = useState('')
  const [entidadResults, setEntidadResults] = useState<Entidad[]>([])
  const [searching, setSearching] = useState(false)
  const [showNewForm] = useState(true)

  const { data: contactosOportunidadData } = useQuery({
    queryKey: ['contactos', 'byEntidad', entidadId ?? undefined],
    queryFn: () => getContactos({ entidad_id: entidadId!, per_page: 100 }),
    enabled: !!entidadId && showNewForm,
  })
  const contactosOportunidad = contactosOportunidadData?.data?.data ?? []

  async function searchEntidad(q: string) {
    setEntidadSearch(q)
    if (!q.trim()) { setEntidadResults([]); return }
    setSearching(true)
    try {
      const res = await getEntidades({ search: q, per_page: 10 })
      setEntidadResults(res.data?.data ?? [])
    } finally {
      setSearching(false)
    }
  }

  function selectEntidad(ent: Entidad) {
    setEntidadId(ent.id)
    setEntidadNombre(`${ent.nombre} — ${ent.identificacion ?? 'Sin NIT'}`)
    setEntidadSearch('')
    setEntidadResults([])
  }

  function clearEntidad() {
    setEntidadId(null)
    setEntidadNombre('')
    setContactoId(undefined)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!entidadId) return
    setLoading(true)
    setError(null)
    try {
      const res = await createOportunidad({
        entidad_id: entidadId,
        contacto_id: contactoId,
        observaciones,
        estado: 'Borrador',
        fecha: new Date().toISOString().slice(0, 10),
      })
      if (res.success && res.data) {
        onCreated()
        onClose()
      } else {
        setError(res.error ?? 'Error al crear')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlidePanel open onClose={onClose} title="Nueva Oportunidad" mode="overlay">
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-2">Cliente (Entidad) *</label>
          {entidadId ? (
            <div className="flex items-center gap-2 p-3 bg-slate-800 border border-teal-600 rounded-xl">
              <span className="flex-1 text-slate-200 text-sm">{entidadNombre}</span>
              <button type="button" onClick={clearEntidad} className="text-slate-400 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-slate-700 transition-colors">
                Cambiar
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre o NIT…"
                value={entidadSearch}
                onChange={e => searchEntidad(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {entidadResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                  {entidadResults.map(ent => (
                    <button
                      key={ent.id}
                      type="button"
                      onClick={() => selectEntidad(ent)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-200 text-sm border-b border-slate-700 last:border-b-0 transition-colors"
                    >
                      <span className="font-medium">{ent.nombre}</span>
                      <span className="text-slate-400 text-xs ml-2">{ent.identificacion ?? '—'}</span>
                    </button>
                  ))}
                </div>
              )}
              {entidadSearch && !searching && entidadResults.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">Sin resultados. Verificá que el nombre o NIT esté bien escrito.</p>
              )}
            </div>
          )}
        </div>

        {entidadId && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Contacto (opcional)</label>
            <select
              value={contactoId ?? ''}
              onChange={(e) => setContactoId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">Sin contacto asignado</option>
              {contactosOportunidad.map((c) => (
                <option key={c.id} value={c.id}>{c.nombres} {c.apellidos}{c.cargo ? ` - ${c.cargo}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-400 mb-2">Observaciones</label>
          <textarea
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            rows={3}
            placeholder="Notas iniciales..."
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none"
          />
        </div>

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
            disabled={loading}
            className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Creando...' : 'Crear'}
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}

// ── Bulk Move Modal ──────────────────────────────

function BulkMoveModal({
  selectedCount,
  pipelines,
  onClose,
  onMove,
  loading,
}: {
  selectedCount: number
  pipelines: any[]
  onClose: () => void
  onMove: (targetPipelineEtapaId: number) => void
  loading: boolean
}) {
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null)
  const [selectedEtapaId, setSelectedEtapaId] = useState<number | null>(null)

  const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId)
  const etapas = selectedPipeline?.etapas
    ? (Array.isArray(selectedPipeline.etapas) ? selectedPipeline.etapas : Object.values(selectedPipeline.etapas))
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-slate-200 mb-2">Mover {selectedCount} oportunidad{selectedCount !== 1 ? 'es' : ''}</h3>
        <p className="text-sm text-slate-400 mb-4">Seleccioná el pipeline y la etapa de destino</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Pipeline</label>
            <select
              value={selectedPipelineId ?? ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null
                setSelectedPipelineId(id)
                setSelectedEtapaId(null)
              }}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            >
              <option value="">Seleccionar pipeline...</option>
              {(pipelines ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Etapa</label>
            <select
              value={selectedEtapaId ?? ''}
              onChange={e => setSelectedEtapaId(e.target.value ? Number(e.target.value) : null)}
              disabled={!selectedPipelineId}
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 disabled:opacity-50"
            >
              <option value="">Seleccionar etapa...</option>
              {etapas.map((e: any) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedEtapaId && onMove(selectedEtapaId)}
            disabled={!selectedEtapaId || loading}
            className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Moviendo...' : 'Mover'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────

export function CRMPage() {
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const {
    selectedPipelineId,
    setSelectedPipelineId,
    pipelines: contextPipelines,
    view,
    setView,
    createSignal,
  } = useOutletContext<CRMLayoutContext>()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedOportunidadId, setSelectedOportunidadId] = useState<number | null>(null)
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false)
  const [showSendQuoteModal, setShowSendQuoteModal] = useState(false)
  const [seguimientoContacto, setSeguimientoContacto] = useState<{ id: number; nombre: string } | null>(null)
  const [selectedOppIds, setSelectedOppIds] = useState<Set<number>>(new Set())
  const [showBulkMove, setShowBulkMove] = useState(false)
  const [bulkTargetEtapaId, setBulkTargetEtapaId] = useState<number | null>(null)
  // Kanban sticky scrollbar: ref to the actual scroll container + a "shim" track
  // that mirrors its scrollLeft. The shim is `sticky bottom-0` so the bar stays
  // visible even when the user scrolls vertically through long kanban cards.
  const kanbanScrollRef = useRef<HTMLDivElement | null>(null)
  const kanbanShimRef = useRef<HTMLDivElement | null>(null)
  const [kanbanMaxScroll, setKanbanMaxScroll] = useState(0)
  const [kanbanScrollLeft, setKanbanScrollLeft] = useState(0)
  useEffect(() => {
    const el = kanbanScrollRef.current
    if (!el) return
    function recompute() {
      if (!el) return
      setKanbanMaxScroll(Math.max(0, el.scrollWidth - el.clientWidth))
    }
    recompute()
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [byEstado])
  const { user } = useAuth()
  const isAdmin = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin'

  const [filters, setFilters] = useState({
    search: '',
    estado: '',
    entidad_id: '',
    producto_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    pipeline_id: selectedPipelineId,
  })

  // Input value is local + immediate; filters.search is debounced so the
  // query only refires after the user stops typing.
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebouncedValue(searchInput, 1000)
  useEffect(() => {
    setFilters(prev => (prev.search === debouncedSearch ? prev : { ...prev, search: debouncedSearch }))
  }, [debouncedSearch])

  // Sync pipeline from CRMLayout context into filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, pipeline_id: selectedPipelineId }))
  }, [selectedPipelineId])
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { data: productosRes } = useQuery({
    queryKey: ['productos'],
    queryFn: () => getProductos({ per_page: 100 }),
  })
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters)
  }, [])

  function toggleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const sortIndicator = (column: string) => {
    if (sortBy !== column) return ' \u2195'
    return sortOrder === 'asc' ? ' \u2191' : ' \u2193'
  }

  const productos = productosRes?.data?.data ?? []

  const pipelines = Array.isArray(contextPipelines) ? contextPipelines : []

  const selectedPipeline = useMemo(() => {
    if (pipelines.length === 0) return null
    return pipelines.find((p: any) => String(p.id) === selectedPipelineId) || pipelines[0]
  }, [pipelines, selectedPipelineId])

  const columns: Column[] = useMemo(() => {
    if (!selectedPipeline?.etapas) return []
    const colors = {
      Borrador: 'bg-slate-600',
      Enviada: 'bg-blue-600',
      Aceptada: 'bg-purple-600',
      Rechazada: 'bg-red-600',
      Ganada: 'bg-emerald-600',
      Perdida: 'bg-gray-600',
    } as Record<string, string>

    const etapasRaw = selectedPipeline.etapas
    const etapas = Array.isArray(etapasRaw) ? etapasRaw : Object.values(etapasRaw)

    return etapas.map((etapa: any) => ({
      id: String(etapa.id),
      label: etapa.nombre,
      color: colors[etapa.nombre] ?? 'bg-slate-600',
    }))
  }, [selectedPipeline])

  // Custom collision: detect column by pointer X position (ignores card droppables)
  function kanbanCollisionDetection(args: any) {
    const { droppableContainers, pointerCoordinates } = args
    if (!pointerCoordinates) return []

    const { x } = pointerCoordinates

    // Only check column containers (string IDs = etapa IDs)
    for (const container of droppableContainers) {
      if (typeof container.id !== 'string') continue
      const node = container.node?.current
      if (!node) continue
      const rect = node.getBoundingClientRect()
      if (x >= rect.left && x <= rect.right) {
        return [{ id: container.id, data: { droppableContainer: container } }]
      }
    }

    return []
  }

  const currentMonth = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Handle ?oportunidad_id=X query param
  useEffect(() => {
    const oportunidadId = searchParams.get('oportunidad_id')
    if (oportunidadId) {
      setSelectedOportunidadId(Number(oportunidadId))
    }
  }, [searchParams])

  // Open create modal when "Nueva Oportunidad" is clicked in CRMLayout
  useEffect(() => {
    if (createSignal > 0) setShowCreateModal(true)
  }, [createSignal])

  const PER_PAGE = 50

  const {
    data: oportunidadesPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteQuery({
    queryKey: ['oportunidades', filters, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await getOportunidades({
        search: filters.search || undefined,
        estado: filters.estado || undefined,
        entidad_id: filters.entidad_id ? Number(filters.entidad_id) : undefined,
        producto_id: filters.producto_id ? Number(filters.producto_id) : undefined,
        fecha_desde: filters.fecha_desde || undefined,
        fecha_hasta: filters.fecha_hasta || undefined,
        pipeline_id: filters.pipeline_id ? Number(filters.pipeline_id) : undefined,
        page: pageParam,
        per_page: PER_PAGE,
        sort_by: sortBy,
        sort_order: sortOrder,
        is_latest: true,
      })
      return res
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.data?.total ?? 0
      const loaded = allPages.length * PER_PAGE
      return loaded < total ? allPages.length + 1 : undefined
    },
    placeholderData: keepPreviousData,
  })

  const oportunidades: Oportunidad[] = oportunidadesPages?.pages.flatMap(p => p.data?.data ?? []) ?? []
  const totalOpps = oportunidadesPages?.pages[0]?.data?.total ?? 0

  const byEstado = useMemo(() => {
    const map: Record<string, Oportunidad[]> = {}
    for (const col of columns) { map[col.id] = [] }
    for (const op of oportunidades) {
      // Group by pipeline_etapa_id (the actual column) instead of estado (legacy)
      const key = String(op.pipeline_etapa_id ?? '')
      if (map[key]) { map[key].push(op) }
      else if (columns.length > 0 && map[columns[0].id]) {
        map[columns[0].id].push(op)
      }
    }
    return map
  }, [oportunidades, columns])

  const activeOportunidad = useMemo(
    () => oportunidades.find(o => o.id === activeId),
    [oportunidades, activeId],
  )

  const updateEstado = useMutation({
    mutationFn: ({ id, pipeline_etapa_id }: { id: number; pipeline_etapa_id: number }) =>
      updateOportunidadPipelineEtapa(id, pipeline_etapa_id),
    onMutate: async ({ id, pipeline_etapa_id }) => {
      await queryClient.cancelQueries({ queryKey: ['oportunidades'] })
      const previous = queryClient.getQueryData(['oportunidades', filters, sortBy, sortOrder])

      // Find the etapa name for the new pipeline_etapa_id
      const etapa = selectedPipeline?.etapas
        ? (Array.isArray(selectedPipeline.etapas) ? selectedPipeline.etapas : Object.values(selectedPipeline.etapas))
            .find((e: any) => e.id === pipeline_etapa_id)
        : null
      const newEstado = etapa?.nombre ?? 'Borrador'

      // Optimistic update: list query
      queryClient.setQueryData(['oportunidades', filters, sortBy, sortOrder], (old: any) => {
        if (!old || !old.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: {
              ...page.data,
              data: page.data.data.map((o: any) => o.id === id ? {
                ...o,
                pipeline_etapa_id,
                estado: newEstado  // Also update estado for grouping
              } : o)
            }
          }))
        }
      })

      // Optimistic update: individual query too (so sidebar reflects immediately)
      queryClient.setQueryData(['oportunidades', id], (old: any) => {
        if (!old?.success) return old
        return { ...old, data: { ...old.data, pipeline_etapa_id } }
      })

      return { previous }
    },
    onError: (_err, _newVal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['oportunidades', filters, sortBy, sortOrder], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })

  const clonar = useMutation({
    mutationFn: (id: number) => clonarOportunidad(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oportunidades'] }),
  })

  const ganar = useMutation({
    mutationFn: (id: number) => ganarOportunidad(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['oportunidades'] }),
  })

  const deleteOportunidadMut = useMutation({
    mutationFn: deleteOportunidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setSelectedOportunidadId(null)
    },
  })

  const crearVersion = useMutation({
    mutationFn: (id: number) => versionarOportunidad(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      if (res?.data?.id) {
        setSelectedOportunidadId(res.data.id)
      }
    },
  })

  function handleDeleteOportunidad(id: number) {
    if (window.confirm('¿Estás seguro de eliminar esta oportunidad?')) {
      deleteOportunidadMut.mutate(id)
    }
  }

  function handleCrearVersion(id: number) {
    setActionLoading('version')
    crearVersion.mutate(id, {
      onSuccess: () => setActionLoading(null),
      onError: () => setActionLoading(null),
    })
  }

  // Sidebar action mutations
  const saveForm = useMutation({
    mutationFn: ({ id, formData }: { id: number; formData: Partial<Oportunidad> }) =>
      updateOportunidad(id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad', selectedOportunidadId] })
    },
  })

  const aprobar = useMutation({
    mutationFn: (id: number) => aprobarCotizacion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidad', selectedOportunidadId] })
    },
  })

  const bulkMove = useMutation({
    mutationFn: bulkMoveOportunidades,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setSelectedOppIds(new Set())
      setShowBulkMove(false)
      setBulkTargetEtapaId(null)
    },
  })

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  // ── Seguimiento rápido ─────────────────────────
  const [quickSegTipo, setQuickSegTipo] = useState('Llamada')
  const [quickSegTexto, setQuickSegTexto] = useState('')
  const [quickSegFecha, setQuickSegFecha] = useState(new Date().toISOString().slice(0, 10))
  const [quickSegHora, setQuickSegHora] = useState('')

  const createQuickSeg = useMutation({
    mutationFn: (vars: { tipo: string; notas: string; fecha: string; hora?: string; oportunidad_id: number; entidad_id?: number }) =>
      createSeguimiento(vars),
    onSuccess: () => {
      setQuickSegTexto('')
      setQuickSegFecha(new Date().toISOString().slice(0, 10))
      setQuickSegHora('')
      // Invalidate ALL seguimiento queries (timeline, list, etc.)
      queryClient.invalidateQueries({ queryKey: ['seguimientos'], exact: false })
    },
  })

  function handleQuickSeg() {
    if (!quickSegTexto.trim() || !selectedOportunidadId || !selectedOpp) return
    createQuickSeg.mutate({
      tipo: quickSegTipo as any,
      notas: quickSegTexto,
      fecha: quickSegFecha,
      hora: quickSegHora ? `${quickSegHora}:00` : undefined,
      oportunidad_id: selectedOportunidadId,
      entidad_id: selectedOpp.entidad_id,
    })
  }

  // ── Líneas de detalle ───────────────────────────

  const { data: detallesRes, isLoading: loadingDetalles } = useQuery({
    queryKey: ['detalles', selectedOportunidadId],
    queryFn: () => getDetallesOportunidad(selectedOportunidadId!),
    enabled: !!selectedOportunidadId,
  })
  const detallesData = Array.isArray(detallesRes?.data)
    ? detallesRes.data
    : (detallesRes?.data as any)?.data ?? []

  const [lineas, setLineas] = useState<LineaForm[]>([])

  // Sync from API when data loads
  useEffect(() => {
    if (detallesData.length > 0) {
      setLineas(detallesData.map((d: DetalleOportunidadBackend) => ({
        id: d.id,
        producto_id: d.producto_id,
        concepto: d.concepto ?? '',
        descripcion: d.descripcion ?? d.concepto ?? '',
        cantidad: d.cantidad,
        vr_unitario: d.vr_unitario,
        iva: d.iva,
      })))
    } else if (selectedOportunidadId && !loadingDetalles) {
      setLineas([])
    }
  }, [detallesData, selectedOportunidadId, loadingDetalles])

  const [lineasSaving, setLineasSaving] = useState(false)
  const [lineasError, setLineasError] = useState<string | null>(null)
  const [lineasSuccess, setLineasSuccess] = useState(false)

  async function handleSaveLines() {
    if (!selectedOportunidadId) return
    setLineasSaving(true)
    setLineasError(null)
    setLineasSuccess(false)
    try {
      const validLines = lineas.filter(l => l.producto_id)
      if (validLines.length === 0) {
        setLineasError('Agregá al menos un producto a las líneas.')
        return
      }
      for (const line of validLines) {
        const payload: DetalleOportunidadCreate = {
          producto_id: line.producto_id!,
          concepto: line.concepto || undefined,
          descripcion: line.descripcion || undefined,
          cantidad: line.cantidad,
          vr_unitario: line.vr_unitario === '' ? 0 : Number(line.vr_unitario),
        }
        // IVA se excluye del payload — el backend lo recalcula desde el producto
        // para evitar colisión porcentaje vs monto calculado
        if (line.id) {
          await updateDetalleOportunidad(line.id, payload)
        } else {
          await createDetalleOportunidad(selectedOportunidadId, payload)
        }
      }
      setLineasSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['detalles', selectedOportunidadId] })
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      setTimeout(() => setLineasSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error && 'response' in err
        ? (err as any).response?.data?.error ?? 'Error del servidor'
        : err instanceof Error ? err.message : 'Error al guardar líneas'
      setLineasError(msg)
    } finally {
      setLineasSaving(false)
    }
  }

  function toggleSection(section: string) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Sidebar queries
  const { data: selectedOppRaw } = useQuery({
    queryKey: ['oportunidades', selectedOportunidadId],
    queryFn: () => getOportunidad(selectedOportunidadId!),
    enabled: !!selectedOportunidadId,
  })
  // Unwrap API response: {success, data} → data itself
  const selectedOpp: Oportunidad | null = selectedOppRaw?.data ?? null

  const { data: contactosData } = useQuery({
    queryKey: ['contactos', 'byEntidad', selectedOpp?.entidad_id],
    queryFn: () => getContactos({ entidad_id: selectedOpp?.entidad_id, per_page: 50 }),
    enabled: !!selectedOpp?.entidad_id,
  })

  // Fetch comerciales asignados a la entidad
  const { data: entidadUsuariosData } = useQuery({
    queryKey: ['entidad-usuarios', selectedOpp?.entidad_id],
    queryFn: () => getEntidadUsuarios(selectedOpp!.entidad_id),
    enabled: !!selectedOpp?.entidad_id,
  })
  const comerciales = Array.isArray(entidadUsuariosData?.data) ? entidadUsuariosData.data : []

  // Fetch seguimientos for timeline
  const { data: timelineSegData } = useQuery({
    queryKey: ['seguimientos', 'timeline', selectedOportunidadId],
    queryFn: () => getSeguimientos({ oportunidad_id: selectedOportunidadId!, per_page: 100 }),
    enabled: !!selectedOportunidadId,
  })

  // Historial de versiones: base codigo (sin sufijo -V{N}) + todas las versiones
  const baseCodigo = selectedOpp?.codigo?.replace(/-V\d+$/i, '') ?? ''
  const { data: historyData } = useQuery({
    queryKey: ['oportunidades', 'history', baseCodigo],
    queryFn: () => getOportunidades({
      search: baseCodigo || undefined,
      is_latest: false,
      per_page: 50,
      sort_by: 'version',
      sort_order: 'desc',
    }),
    enabled: !!selectedOpp,
  })
  const historyVersiones: Oportunidad[] = historyData?.data?.data ?? []
  const showHistory = historyVersiones.length > 1

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeOp = oportunidades.find(o => o.id === active.id)
    if (!activeOp) return

    const overId = over.id
    let targetColumnId: string | null = null

    // If over is a column (string ID like "123" = etapa ID)
    if (typeof overId === 'string') {
      const col = columns.find(c => c.id === overId)
      if (col) targetColumnId = col.id
    }

    // If over is a card (number ID) — find which column that card belongs to
    if (!targetColumnId && typeof overId === 'number') {
      const col = columns.find(c => byEstado[c.id]?.some(o => o.id === overId))
      if (col) targetColumnId = col.id
    }

    // If over is the same card (dropped on itself) — find which column IT belongs to
    if (!targetColumnId && overId === active.id) {
      const col = columns.find(c => byEstado[c.id]?.some(o => o.id === active.id))
      if (col) targetColumnId = col.id
    }

    if (targetColumnId) {
      const targetEtapaId = Number(targetColumnId)
      if (targetEtapaId && targetEtapaId !== activeOp.pipeline_etapa_id) {
        updateEstado.mutate({ id: activeOp.id, pipeline_etapa_id: targetEtapaId })
      }
    }
  }

  function handleToggleSelect(id: number) {
    setSelectedOppIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleSelectAll() {
    if (selectedOppIds.size === oportunidades.length) {
      setSelectedOppIds(new Set())
    } else {
      setSelectedOppIds(new Set(oportunidades.map(o => o.id)))
    }
  }

  function handleCardClick(id: number) {
    setSelectedOportunidadId(id)
  }

  function handleCloseSidebar() {
    setSelectedOportunidadId(null)
  }

  function handleOpenSeguimiento(contactoId: number, contactoNombre: string) {
    setSeguimientoContacto({ id: contactoId, nombre: contactoNombre })
    setShowSeguimientoModal(true)
  }

  // T-FE-12: handle "+ Seguimiento" from a kanban card. The oportunidad must
  // already have a contacto_id (button is disabled otherwise). Open the same
  // modal used by contacto detail, pre-filled with oportunidad_id + entidad_id.
  function handleAddSeguimiento(oportunidadId: number) {
    const oportunidad = oportunidades.find(o => o.id === oportunidadId)
    if (!oportunidad?.contacto_id) return
    handleOpenSeguimiento(
      oportunidad.contacto_id,
      oportunidad.contacto_nombre ?? `Contacto #${oportunidad.contacto_id}`,
    )
  }

  function handleSeguimientoLogged() {
    queryClient.invalidateQueries({ queryKey: ['seguimientos'] })
    setShowSeguimientoModal(false)
    setSeguimientoContacto(null)
  }

  async function handleDownloadPdf() {
    if (!selectedOportunidadId) return
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
    const token = localStorage.getItem('auth_token')
    try {
      const res = await fetch(`${base}/oportunidades/${selectedOportunidadId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (err) {
      console.error('Error al descargar PDF:', err)
    }
  }

  function handleEnviar() {
    if (!selectedOportunidadId) return
    setShowSendQuoteModal(true)
  }

  function handleAprobar() {
    if (!selectedOportunidadId) return
    setActionLoading('aprobar')
    aprobar.mutate(selectedOportunidadId, {
      onSuccess: () => setActionLoading(null),
      onError: () => setActionLoading(null),
    })
  }

  function handleGanar() {
    if (!selectedOportunidadId) return
    setActionLoading('ganar')
    ganar.mutate(selectedOportunidadId, {
      onSuccess: () => setActionLoading(null),
      onError: () => setActionLoading(null),
    })
  }

  async function handleSaveCotizacion(data: Partial<Oportunidad>): Promise<void> {
    if (!selectedOportunidadId) return
    await saveForm.mutateAsync({ id: selectedOportunidadId, formData: data })
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
        Error al cargar oportunidades.
      </div>
    )
  }

  return (
    <>
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">CRM</h1>
          <p className="text-slate-400">{totalOpps} oportunidades</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Empty — view toggle and create button are now in CRMLayout nav */}
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        productos={productos}
        estadosOptions={columns}
        inputSearch={searchInput}
        onSearchChange={setSearchInput}
      />

      {/* Bulk Actions Bar */}
      {selectedOppIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-teal-900/30 border border-teal-700/50 rounded-xl">
          <span className="text-sm text-teal-300 font-medium">
            {selectedOppIds.size} seleccionada{selectedOppIds.size !== 1 ? 's' : ''}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowBulkMove(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowRight size={16} />
            Mover a pipeline
          </button>
          <button
            onClick={() => setSelectedOppIds(new Set())}
            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Kanban / List */}
      {isLoading ? (
        view === 'kanban' ? (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {columns.length > 0 ? columns.map(col => (
              <div key={col.id} className="flex-shrink-0 w-72">
                <div className={`px-3 py-2 rounded-t-xl ${col.color} opacity-60 text-white font-medium text-sm`}>
                  <span>{col.label}</span>
                </div>
                <div className="bg-slate-800 rounded-b-xl p-3 min-h-64 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-slate-700/60 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            )) : [...Array(6)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-72 h-64 bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 border-b border-slate-700/50 bg-slate-800 animate-pulse" />
            ))}
          </div>
        )
      ) : view === 'kanban' ? (
        <DndContext
          sensors={sensors}
          collisionDetection={kanbanCollisionDetection}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Kanban scroll container. The native scrollbar is hidden — a
              sticky bottom "shim" below provides a persistent scrollbar
              that's always visible regardless of vertical scroll position. */}
          <div
            ref={kanbanScrollRef}
            onScroll={(e) => {
              const sl = e.currentTarget.scrollLeft
              setKanbanScrollLeft(sl)
              if (kanbanShimRef.current) kanbanShimRef.current.scrollLeft = sl
            }}
            className="kanban-scroll-container flex gap-3 md:gap-4 overflow-x-auto -mx-4 px-4 pt-2 pb-1 min-w-full"
          >
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                column={col}
                oportunidades={byEstado[col.id] ?? []}
                onClone={(id) => clonar.mutate(id)}
                onVersionar={(id) => crearVersion.mutate(id)}
                onGanar={(id) => ganar.mutate(id)}
                onDelete={isAdmin ? handleDeleteOportunidad : undefined}
                onCardClick={handleCardClick}
                selectedOppIds={selectedOppIds}
                onToggleSelect={handleToggleSelect}
                onAddSeguimiento={handleAddSeguimiento}
              />
            ))}
          </div>

          {/* Sticky bottom scrollbar shim. Always visible. Drag it to scroll
              the kanban. The inner div's width matches the kanban content
              width so the thumb position is accurate. */}
          <div
            className="sticky bottom-0 -mx-4 px-4 pt-1 pb-3 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent"
            style={{ pointerEvents: kanbanMaxScroll > 0 ? 'auto' : 'none' }}
          >
            <div
              ref={kanbanShimRef}
              onScroll={(e) => {
                const sl = e.currentTarget.scrollLeft
                if (kanbanScrollRef.current) kanbanScrollRef.current.scrollLeft = sl
                setKanbanScrollLeft(sl)
              }}
              className="overflow-x-auto h-4 rounded bg-slate-800/60 border border-slate-700/60"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#64748b #1e293b' }}
              aria-hidden="true"
            >
              <div
                style={{
                  width: `${kanbanMaxScroll + (kanbanScrollRef.current?.clientWidth ?? 0)}px`,
                  height: '1px',
                }}
              />
            </div>
            {/* Position indicator: shows current scroll position */}
            {kanbanMaxScroll > 0 && (
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 px-1">
                <span>Inicio</span>
                <span>{Math.round((kanbanScrollLeft / kanbanMaxScroll) * 100)}%</span>
                <span>Fin</span>
              </div>
            )}
          </div>
          <DragOverlay>
            {activeOportunidad && (
              <div className="bg-slate-600 p-3 rounded-xl w-72 shadow-xl opacity-90">
                <p className="font-medium text-slate-200 text-sm">{activeOportunidad.codigo}</p>
                <p className="text-slate-400 text-xs truncate">{activeOportunidad.entidad_nombre ?? `#${activeOportunidad.entidad_id}`}</p>
                <p className="text-slate-500 text-[10px]">{activeOportunidad.entidad_identificacion ?? ''}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
         /* ── List View ── */
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={oportunidades.length > 0 && selectedOppIds.size === oportunidades.length}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort('codigo')}>
                  Código{sortIndicator('codigo')}
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort('entidad')}>
                  Cliente{sortIndicator('entidad')}
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Pipeline</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">NIT</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort('fecha')}>
                  Fecha{sortIndicator('fecha')}
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Productos</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium cursor-pointer hover:text-slate-200 select-none" onClick={() => toggleSort('valor')}>
                  Valor{sortIndicator('valor')}
                </th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {oportunidades.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center px-4 py-8 text-slate-500">Sin oportunidades</td>
                </tr>
              )}
              {oportunidades.map(op => {
                const detallesArr2 = (op as any).detalles
                const detalles = Array.isArray(detallesArr2) ? detallesArr2 : []
                const tags: string[] = Array.from(new Set(detalles.map((d: any) => d.producto?.referencia ?? '').filter(Boolean)))
                return (
                <tr 
                  key={op.id} 
                  className={`border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer ${selectedOppIds.has(op.id) ? 'bg-teal-900/20' : ''}`}
                  onClick={() => handleCardClick(op.id)}
                >
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedOppIds.has(op.id)}
                      onChange={() => handleToggleSelect(op.id)}
                      className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">{op.codigo}</td>
                  <td className="px-4 py-3 text-slate-400">{op.entidad_nombre ?? `#${op.entidad_id}`}</td>
                  <td className="px-4 py-3 text-slate-400">{pipelines.find(p => p.id === (op as any).pipeline_id)?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{op.entidad_identificacion ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{op.fecha ? new Date(op.fecha).toLocaleDateString('es-ES') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 2).map((t: string, i: number) => (
                        <span key={i} className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300">{t}</span>
                      ))}
                      {tags.length > 2 && <span className="text-[10px] text-slate-500">+{tags.length - 2}</span>}
                      {tags.length === 0 && <span className="text-[10px] text-slate-500">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-teal-400">
                    {op.valor != null && op.valor > 0 ? `$${Number(op.valor).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      op.estado === 'Ganada' ? 'bg-emerald-500/20 text-emerald-400' :
                      op.estado === 'Aceptada' ? 'bg-purple-500/20 text-purple-400' :
                      op.estado === 'Rechazada' ? 'bg-red-500/20 text-red-400' :
                      op.estado === 'Enviada' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-slate-600 text-slate-300'
                    }`}>
                      {(() => { const c = columns.find(col => col.id === String(op.pipeline_etapa_id ?? '')); return c ? c.label : op.estado })()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {op.estado === 'Aceptada' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); ganar.mutate(op.id) }}
                          className="p-1.5 rounded-lg hover:bg-emerald-900 text-slate-400 hover:text-emerald-400"
                          title="Marcar como ganada"
                        >
                          <Check size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); clonar.mutate(op.id) }}
                        className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-teal-400"
                        title="Clonar"
                      >
                        <Copy size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteOportunidad(op.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cargar más */}
      {!isLoading && oportunidades.length > 0 && hasNextPage && (
        <div className="flex justify-center mt-6">
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
        <p className="text-xs text-slate-500 text-center mt-4">
          {oportunidades.length} de {totalOpps} oportunidad{totalOpps !== 1 ? 'es' : ''}
        </p>
      )}

      </div>

      {showCreateModal && (
        <NuevaOportunidadModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['oportunidades'] })}
        />
      )}

    {/* Opportunity Detail Sidebar — split en desktop, overlay en mobile */}
      {selectedOportunidadId && selectedOpp && (
        <>
          {/* Backdrop for mobile/tablet */}
          <div 
            className="fixed inset-0 bg-black/40 z-30 xl:hidden"
            onClick={handleCloseSidebar}
          />
          <div className="fixed xl:static right-0 top-0 h-full xl:h-auto w-full xl:w-[30%] xl:min-w-[380px] max-w-[640px] z-40 xl:z-auto bg-slate-900 border-l border-slate-700 flex flex-col overflow-y-auto shadow-2xl">
            {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Detalle de Oportunidad</h3>
                <button onClick={handleCloseSidebar} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-200">{selectedOpp.codigo}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={selectedOpp.pipeline_etapa_id ?? ''}
                      onChange={(e) => {
                        const etapaId = Number(e.target.value)
                        if (!etapaId) return
                        updateEstado.mutate({ id: selectedOpp.id, pipeline_etapa_id: etapaId })
                        queryClient.setQueryData(['oportunidades', selectedOportunidadId], (old: any) => {
                          if (!old?.success) return old
                          return { ...old, data: { ...old.data, pipeline_etapa_id: etapaId } }
                        })
                      }}
                      className="px-2 py-1 rounded-lg text-xs font-medium border-0 bg-slate-600 text-slate-300"
                    >
                      {selectedPipeline?.etapas && Array.isArray(selectedPipeline.etapas) && selectedPipeline.etapas.map((etapa: any) => (
                        <option key={etapa.id} value={etapa.id} className="bg-slate-800 text-slate-200">{etapa.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={handleCloseSidebar}
                  className="text-slate-400 hover:text-slate-200 p-2"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Client Info */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Cliente</h3>
                <p className="text-slate-200 font-medium">{selectedOpp.entidad_nombre ?? `#${selectedOpp.entidad_id}`}</p>
                {selectedOpp.entidad_identificacion && (
                  <p className="text-slate-400 text-sm mt-1">{selectedOpp.entidad_identificacion}</p>
                )}
              </div>

              {/* Comercial(es) Asignado(s) */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Comercial(es) Asignado(s)</h3>
                {comerciales.length === 0 ? (
                  <p className="text-slate-500 text-sm">Sin comercial asignado</p>
                ) : (
                  <div className="space-y-2">
                    {comerciales.map((u: Usuario) => (
                      <div key={u.id} className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-teal-600/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-teal-400">{u.nombre.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-slate-200 text-sm font-medium">{u.nombre}</p>
                          <p className="text-slate-500 text-xs">{u.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contacts Section */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3">Contactos</h3>
                <div className="space-y-3">
                  {Array.isArray(contactosData?.data?.data) && contactosData.data.data.length > 0 ? (
                    contactosData.data.data.map(contacto => (
                      <div key={contacto.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-200 font-medium">{`${contacto.nombres} ${contacto.apellidos}`.trim()}</p>
                            {contacto.cargo && (
                              <p className="text-slate-400 text-sm">{contacto.cargo}</p>
                            )}
                            <div className="flex gap-3 mt-2">
                              {(contacto.movil || contacto.tel_contacto) && (
                                <a 
                                  href={`tel:${contacto.movil || contacto.tel_contacto}`}
                                  className="text-slate-400 hover:text-teal-400 text-sm flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone size={14} />
                                  <span>{contacto.movil || contacto.tel_contacto}</span>
                                </a>
                              )}
                              {contacto.email_contacto && (
                                <a 
                                  href={`mailto:${contacto.email_contacto}`}
                                  className="text-slate-400 hover:text-teal-400 text-sm flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail size={14} />
                                  <span>{contacto.email_contacto}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenSeguimiento(contacto.id, `${contacto.nombres} ${contacto.apellidos}`.trim())}
                          className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={14} />
                          Registrar Seguimiento
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm">Sin contactos registrados</p>
                  )}
                </div>
              </div>

              {/* Seguimiento rápido */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <MessageSquare size={14} />
                    Seguimiento Rápido
                  </h3>
                  <div className="flex gap-2">
                    <select
                      value={quickSegTipo}
                      onChange={e => setQuickSegTipo(e.target.value)}
                      className="flex-1 px-2 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    >
                      <option value="Llamada">📞 Llamada</option>
                      <option value="Correo">📧 Correo</option>
                      <option value="Reunion">📅 Reunión</option>
                      <option value="Nota">📝 Nota</option>
                    </select>
                    {createQuickSeg.isPending ? (
                      <button disabled className="px-3 py-2 bg-teal-800 text-slate-400 rounded-lg text-xs">Enviando...</button>
                    ) : (
                      <button
                        onClick={handleQuickSeg}
                        disabled={!quickSegTexto.trim()}
                        className="px-3 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        Enviar
                      </button>
                    )}
                  </div>
                  <textarea
                    value={quickSegTexto}
                    onChange={e => setQuickSegTexto(e.target.value)}
                    placeholder="Notas del seguimiento..."
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={quickSegFecha}
                      onChange={e => setQuickSegFecha(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    />
                    <input
                      type="time"
                      value={quickSegHora}
                      onChange={e => setQuickSegHora(e.target.value)}
                      className="w-full px-2 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">Si asignás fecha futura, se programa como próximo seguimiento.</p>
                </div>
              </div>

              {/* Cotización Editor (collapsible) */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => toggleSection('cotizacion')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-slate-300">Cotización</h3>
                  {collapsedSections.has('cotizacion') ? (
                    <ChevronRight size={16} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500" />
                  )}
                </button>
                {!collapsedSections.has('cotizacion') && (
                  <div className="p-4 border-t border-slate-700">
                    <CotizacionEditor
                      oportunidad={selectedOpp}
                      onSave={handleSaveCotizacion}
                    />
                  </div>
                )}
              </div>

              {/* Líneas de Cotización (collapsible) */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <button
                  onClick={() => toggleSection('lineas')}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-slate-300">Líneas de Cotización</h3>
                  {collapsedSections.has('lineas') ? (
                    <ChevronRight size={16} className="text-slate-500" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-500" />
                  )}
                </button>
                {!collapsedSections.has('lineas') && (
                  <div className="p-4 border-t border-slate-700">
                    <DetalleLineEditor
                      lines={lineas}
                      onChange={setLineas}
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => setLineas(prev => prev.slice(0, -1))}
                        disabled={lineasSaving}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        Eliminar última
                      </button>
                      <button
                        onClick={() => setLineas(prev => [...prev, { producto_id: null, concepto: '', descripcion: '', cantidad: 1, vr_unitario: '', iva: '' }])}
                        disabled={lineasSaving}
                        className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        + Agregar línea
                      </button>
                      <button
                        onClick={handleSaveLines}
                        disabled={lineasSaving}
                        className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {lineasSaving ? 'Guardando...' : lineasSuccess ? '✓ Guardado' : 'Guardar'}
                      </button>
                    </div>
                    {lineasError && (
                      <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{lineasError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Historial de versiones (collapsible) */}
              {showHistory && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <button
                    onClick={() => toggleSection('historial')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 transition-colors"
                  >
                    <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <FileText size={14} />
                      Historial de versiones
                      <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300 font-medium">
                        {historyVersiones.length}
                      </span>
                    </h3>
                    {collapsedSections.has('historial') ? (
                      <ChevronRight size={16} className="text-slate-500" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-500" />
                    )}
                  </button>
                  {!collapsedSections.has('historial') && (
                    <div className="border-t border-slate-700 divide-y divide-slate-700/60">
                      {historyVersiones.map(v => {
                        const isCurrent = v.id === selectedOpp?.id
                        return (
                          <div key={v.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-700/30">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-200 text-sm font-medium truncate">{v.codigo}</span>
                                <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] text-slate-300 font-medium">
                                  v{v.version ?? 1}
                                </span>
                                {v.is_latest && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-medium">
                                    Última
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                <span>{v.estado}</span>
                                <span>·</span>
                                <span>{v.updated_at ? new Date(v.updated_at).toLocaleDateString('es-ES') : '—'}</span>
                                {v.valor != null && v.valor > 0 && (
                                  <>
                                    <span>·</span>
                                    <span className="text-teal-400">
                                      ${Number(v.valor).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {isCurrent ? (
                              <span className="text-[10px] text-slate-500 ml-2">Actual</span>
                            ) : (
                              <button
                                onClick={() => setSelectedOportunidadId(v.id)}
                                className="text-xs text-teal-400 hover:text-teal-300 ml-2"
                              >
                                Ver esta versión
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Seguimientos Timeline */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Calendar size={14} />
                    Seguimientos
                  </h3>
                  <a
                    href={downloadMonthlyCalendarIcsUrl(currentMonth, { entidad_id: selectedOpp?.entidad_id })}
                    download
                    className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1"
                  >
                    <CalendarDays size={13} />
                    .ics
                  </a>
                </div>
                <SeguimientoTimeline seguimientos={timelineSegData?.data?.data ?? []} />
              </div>

              {/* Action Buttons */}
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-2">
                <ActionButtons
                  estado={selectedOpp.estado}
                  onDownloadPdf={handleDownloadPdf}
                  onEnviar={handleEnviar}
                  onAprobar={handleAprobar}
                  onGanar={handleGanar}
                  loading={actionLoading}
                />
                
                {selectedOpp.estado !== 'Ganada' && (
                  <button
                    onClick={() => handleCrearVersion(selectedOpp.id)}
                    disabled={actionLoading === 'version'}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-xl transition-colors border border-slate-600"
                  >
                    {actionLoading === 'version' ? 'Creando versión...' : 'Crear nueva versión'}
                  </button>
                )}

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteOportunidad(selectedOpp.id)}
                    disabled={deleteOportunidadMut.isPending}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/40 hover:bg-red-950/60 disabled:opacity-50 text-red-400 text-sm font-medium rounded-xl transition-colors border border-red-900/30"
                  >
                    <Trash2 size={16} />
                    {deleteOportunidadMut.isPending ? 'Eliminando...' : 'Eliminar Oportunidad'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>

    {/* Seguimiento Modal */}
      {showSeguimientoModal && seguimientoContacto && (
        <SeguimientoModal
          contactoId={seguimientoContacto.id}
          contactoNombre={seguimientoContacto.nombre}
          oportunidadId={selectedOportunidadId ?? undefined}
          entidadId={selectedOpp?.entidad_id}
          onClose={() => {
            setShowSeguimientoModal(false)
            setSeguimientoContacto(null)
          }}
          onLogged={handleSeguimientoLogged}
        />
      )}

      {/* Bulk Move Modal */}
      {showBulkMove && (
        <BulkMoveModal
          selectedCount={selectedOppIds.size}
          pipelines={pipelines}
          onClose={() => { setShowBulkMove(false); setBulkTargetEtapaId(null) }}
          onMove={(targetPipelineEtapaId) => {
            bulkMove.mutate({
              oportunidad_ids: Array.from(selectedOppIds),
              target_pipeline_etapa_id: targetPipelineEtapaId,
            })
          }}
          loading={bulkMove.isPending}
        />
      )}

      {/* Send Quote Modal */}
      {showSendQuoteModal && selectedOpp && (
        <SendQuoteModal
          oportunidadId={selectedOportunidadId!}
          oportunidad={{ codigo: selectedOpp.codigo, entidad_id: selectedOpp.entidad_id }}
          contactos={contactosData?.data?.data ?? []}
          onClose={() => setShowSendQuoteModal(false)}
          onSent={() => {
            setShowSendQuoteModal(false)
            queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
            queryClient.invalidateQueries({ queryKey: ['oportunidad', selectedOportunidadId] })
            queryClient.invalidateQueries({ queryKey: ['seguimientos'], exact: false })
          }}
        />
      )}
    </>
  )
}
