import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPipelines,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createEtapa,
  updateEtapa,
  deleteEtapa,
  reorderEtapas,
} from '../api/crmApi'
import type { Pipeline, PipelineEtapa } from '../api/types'
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  X,
  Check,
  Loader2,
} from 'lucide-react'

// ── Modal helper ──────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Pipeline Form ─────────────────────────────────

interface PipelineFormData {
  nombre: string
  codigo: string
  habilitado: boolean
}

function PipelineForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: PipelineFormData
  onSave: (data: PipelineFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [codigo, setCodigo] = useState(initial?.codigo ?? '')
  const [habilitado, setHabilitado] = useState(initial?.habilitado ?? true)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !codigo.trim()) return
    onSave({ nombre: nombre.trim(), codigo: codigo.trim().toUpperCase(), habilitado })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Flujo de Cotización"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Código *</label>
        <input
          type="text"
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
          placeholder="Ej: COTIZACION"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 uppercase"
        />
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={habilitado}
          onChange={e => setHabilitado(e.target.checked)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500"
        />
        <span className="text-sm text-slate-300">Habilitado</span>
      </label>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !nombre.trim() || !codigo.trim()}
          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Etapa Form ────────────────────────────────────

function EtapaForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: { nombre: string }
  onSave: (data: { nombre: string }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [nombre, setNombre] = useState(initial?.nombre ?? '')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    onSave({ nombre: nombre.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Nombre de la etapa *</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Negociación"
          className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
          autoFocus
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !nombre.trim()}
          className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────

export function PipelineAdmin() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [pipelineModal, setPipelineModal] = useState<{ open: boolean; edit?: Pipeline }>({ open: false })
  const [etapaModal, setEtapaModal] = useState<{ open: boolean; pipelineId?: number; edit?: PipelineEtapa }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'pipeline' | 'etapa'; id: number; name: string } | null>(null)

  const { data: pipelinesRes, isLoading, error } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
  })

  // Unwrap: { success, data: [...] } or paginated wrapper
  const pipelines: Pipeline[] = pipelinesRes?.data
    ? (Array.isArray(pipelinesRes.data) ? pipelinesRes.data : (pipelinesRes.data as any)?.data ?? [])
    : []

  // ── Pipeline mutations ──────────────────────────

  const createPipeMut = useMutation({
    mutationFn: (payload: { nombre: string; codigo: string; habilitado: boolean }) => createPipeline(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setPipelineModal({ open: false })
    },
  })

  const updatePipeMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Pipeline> }) => updatePipeline(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setPipelineModal({ open: false })
    },
  })

  const deletePipeMut = useMutation({
    mutationFn: (id: number) => deletePipeline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setDeleteConfirm(null)
    },
  })

  // ── Etapa mutations ─────────────────────────────

  const createEtapaMut = useMutation({
    mutationFn: ({ pipelineId, nombre }: { pipelineId: number; nombre: string }) =>
      createEtapa(pipelineId, { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setEtapaModal({ open: false })
    },
  })

  const updateEtapaMut = useMutation({
    mutationFn: ({ id, nombre }: { id: number; nombre: string }) =>
      updateEtapa(id, { nombre }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setEtapaModal({ open: false })
    },
  })

  const deleteEtapaMut = useMutation({
    mutationFn: (id: number) => deleteEtapa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
      setDeleteConfirm(null)
    },
  })

  const reorderMut = useMutation({
    mutationFn: ({ pipelineId, ordered_ids }: { pipelineId: number; ordered_ids: number[] }) =>
      reorderEtapas(pipelineId, ordered_ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] })
    },
  })

  // ── Handlers ────────────────────────────────────

  function toggleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function handleSavePipeline(data: { nombre: string; codigo: string; habilitado: boolean }) {
    if (pipelineModal.edit) {
      updatePipeMut.mutate({ id: pipelineModal.edit.id, payload: data })
    } else {
      createPipeMut.mutate(data)
    }
  }

  function handleDeletePipeline(id: number, name: string) {
    setDeleteConfirm({ type: 'pipeline', id, name })
  }

  function handleSaveEtapa(data: { nombre: string }) {
    if (etapaModal.edit) {
      updateEtapaMut.mutate({ id: etapaModal.edit.id, nombre: data.nombre })
    } else if (etapaModal.pipelineId) {
      createEtapaMut.mutate({ pipelineId: etapaModal.pipelineId, nombre: data.nombre })
    }
  }

  function handleDeleteEtapa(id: number, name: string) {
    setDeleteConfirm({ type: 'etapa', id, name })
  }

  function handleReorder(pipelineId: number, etapas: PipelineEtapa[], index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= etapas.length) return
    const ids = etapas.map(e => e.id)
    // Swap positions
    ;[ids[index], ids[newIndex]] = [ids[newIndex], ids[index]]
    reorderMut.mutate({ pipelineId, ordered_ids: ids })
  }

  function confirmDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'pipeline') {
      deletePipeMut.mutate(deleteConfirm.id)
    } else {
      deleteEtapaMut.mutate(deleteConfirm.id)
    }
  }

  // ── Render ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
        Error al cargar pipelines.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Pipelines</h1>
          <p className="text-slate-400 text-sm mt-1">Gestioná los flujos de ventas y sus etapas</p>
        </div>
        <button
          onClick={() => setPipelineModal({ open: true })}
          className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
        >
          <Plus size={18} />
          Crear Pipeline
        </button>
      </div>

      {/* Empty state */}
      {pipelines.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <GitBranchIcon className="mx-auto mb-4 text-slate-600" size={48} />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Sin pipelines</h3>
          <p className="text-slate-500 text-sm mb-6">Creá tu primer pipeline para empezar a organizar tus flujos de ventas.</p>
          <button
            onClick={() => setPipelineModal({ open: true })}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} />
            Crear Pipeline
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pipelines.map((pipeline) => {
            const etapas = pipeline.etapas ?? []
            const isExpanded = expandedId === pipeline.id

            return (
              <div
                key={pipeline.id}
                className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden"
              >
                {/* Pipeline header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleExpand(pipeline.id)}
                    className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200">{pipeline.nombre}</h3>
                      <span className="text-xs text-slate-500 uppercase">{pipeline.codigo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        pipeline.habilitado
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-600 text-slate-400'
                      }`}>
                        {pipeline.habilitado ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {etapas.length} etapa{etapas.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPipelineModal({ open: true, edit: pipeline })}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-teal-400 transition-colors"
                      title="Editar pipeline"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDeletePipeline(pipeline.id, pipeline.nombre)}
                      className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar pipeline"
                    >
                      <Trash2 size={16} />
                    </button>
                    {isExpanded && (
                      <button
                        onClick={() => setEtapaModal({ open: true, pipelineId: pipeline.id })}
                        className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-teal-400 transition-colors"
                        title="Agregar etapa"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Etapas section (expandable) */}
                {isExpanded && (
                  <div className="border-t border-slate-700">
                    {etapas.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">
                        Sin etapas. Agregá la primera etapa.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/50">
                        {etapas.map((etapa, index) => (
                          <div
                            key={etapa.id}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-750 transition-colors"
                          >
                            <span className="text-xs text-slate-600 w-5 text-right">{etapa.orden}</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-slate-200">{etapa.nombre}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleReorder(pipeline.id, etapas, index, 'up')}
                                disabled={index === 0}
                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Subir"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => handleReorder(pipeline.id, etapas, index, 'down')}
                                disabled={index === etapas.length - 1}
                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Bajar"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                onClick={() => setEtapaModal({ open: true, pipelineId: pipeline.id, edit: etapa })}
                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-teal-400 transition-colors"
                                title="Editar etapa"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteEtapa(etapa.id, etapa.nombre)}
                                className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                                title="Eliminar etapa"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {etapas.length > 0 && (
                      <div className="px-4 py-2 border-t border-slate-700/50">
                        <button
                          onClick={() => setEtapaModal({ open: true, pipelineId: pipeline.id })}
                          className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors py-1"
                        >
                          <Plus size={14} />
                          Agregar etapa
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pipeline Modal */}
      <Modal
        open={pipelineModal.open}
        onClose={() => setPipelineModal({ open: false })}
        title={pipelineModal.edit ? 'Editar Pipeline' : 'Crear Pipeline'}
      >
        <PipelineForm
          initial={pipelineModal.edit ? { nombre: pipelineModal.edit.nombre, codigo: pipelineModal.edit.codigo, habilitado: pipelineModal.edit.habilitado } : undefined}
          onSave={handleSavePipeline}
          onCancel={() => setPipelineModal({ open: false })}
          saving={createPipeMut.isPending || updatePipeMut.isPending}
        />
      </Modal>

      {/* Etapa Modal */}
      <Modal
        open={etapaModal.open}
        onClose={() => setEtapaModal({ open: false })}
        title={etapaModal.edit ? 'Editar Etapa' : 'Agregar Etapa'}
      >
        <EtapaForm
          initial={etapaModal.edit ? { nombre: etapaModal.edit.nombre } : undefined}
          onSave={handleSaveEtapa}
          onCancel={() => setEtapaModal({ open: false })}
          saving={createEtapaMut.isPending || updateEtapaMut.isPending}
        />
      </Modal>

      {/* Delete Confirm Dialog */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            ¿Estás seguro de eliminar{' '}
            <strong className="text-slate-100">
              {deleteConfirm?.type === 'pipeline' ? 'el pipeline' : 'la etapa'}
            </strong>{' '}
            <strong className="text-red-400">{deleteConfirm?.name}</strong>?
            {deleteConfirm?.type === 'pipeline' && (
              <span className="block mt-2 text-slate-500 text-xs">
                Se eliminarán también todas sus etapas. Esta acción no se puede deshacer.
              </span>
            )}
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deletePipeMut.isPending || deleteEtapaMut.isPending}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors"
            >
              {deletePipeMut.isPending || deleteEtapaMut.isPending ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ── Icon component for empty state ────────────────

function GitBranchIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size ?? 24}
      height={size ?? 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}
