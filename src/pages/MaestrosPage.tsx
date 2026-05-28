import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Search, Filter, Plus, Pencil, Trash2 } from 'lucide-react'
import { getMaestros, createMaestro, updateMaestro, deleteMaestro } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { Loader2 } from 'lucide-react'
import type { Maestro } from '../api/types'

function MaestroForm({ initialData, onClose }: { initialData?: Maestro; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? '',
    campo: initialData?.campo ?? '',
    habilitado: initialData?.habilitado ?? 'Y',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? updateMaestro(initialData!.id, data)
        : createMaestro(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestros'] })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-slate-50 mb-6">
        {isEdit ? 'Editar Maestro' : 'Nuevo Maestro'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Campo *</label>
          <input
            type="text"
            value={form.campo}
            onChange={(e) => setForm({ ...form, campo: e.target.value })}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Habilitado *</label>
          <select
            value={form.habilitado}
            onChange={(e) => setForm({ ...form, habilitado: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="Y">Sí</option>
            <option value="N">No</option>
          </select>
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Error al guardar. Intenta de nuevo.</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Maestro'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

export function MaestrosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [campoFilter, setCampoFilter] = useState<string>('all')
  const [slidePanel, setSlidePanel] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    data?: Maestro
  }>({ open: false, mode: 'create' })

  const { data: maestrosData, isLoading } = useQuery({
    queryKey: ['maestros'],
    queryFn: () => getMaestros(),
  })

  // Handle both old format (Maestro[]) and new paginated format
  const allMaestros: Maestro[] = Array.isArray(maestrosData?.data)
    ? maestrosData?.data ?? []
    : maestrosData?.data?.data ?? []

  const campos = Array.from(new Set(allMaestros.map(m => m.campo)))

  const maestros = allMaestros.filter(m => {
    const matchCampo = campoFilter === 'all' || m.campo === campoFilter
    const matchSearch = !search ||
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      m.campo.toLowerCase().includes(search.toLowerCase())
    return matchCampo && matchSearch
  })

  const grouped = maestros.reduce<Record<string, Maestro[]>>((acc, m) => {
    if (!acc[m.campo]) acc[m.campo] = []
    acc[m.campo].push(m)
    return acc
  }, {})

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMaestro(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maestros'] })
    },
  })

  function handleDelete(m: Maestro) {
    if (window.confirm(`¿Estás seguro de eliminar "${m.nombre}" (${m.campo})?`)) {
      deleteMutation.mutate(m.id)
    }
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Maestros</h1>
          <p className="text-slate-400">Datos maestros del sistema — tablas de referencia y catálogos</p>
        </div>
        <button
          onClick={() => setSlidePanel({ open: true, mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Maestro
        </button>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o campo..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={campoFilter}
              onChange={e => setCampoFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 appearance-none"
            >
              <option value="all">Todos los campos</option>
              {campos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="w-12 h-4 bg-slate-700 rounded" />
              <div className="w-32 h-4 bg-slate-700 rounded" />
              <div className="flex-1 h-4 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      ) : maestros.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
          <BookOpen size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-lg font-medium">No se encontraron maestros</p>
          <p className="text-slate-500 text-sm mt-1">
            {search || campoFilter !== 'all' ? 'Probá ajustando los filtros' : 'Los maestros aparecerán aquí'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([campo, items]) => (
            <div key={campo} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-slate-750 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-teal-400">
                  {campo}
                  <span className="ml-2 text-xs text-slate-500 font-normal">({items.length} registros)</span>
                </h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider w-16">ID</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider w-24">Estado</th>
                    <th className="text-right px-4 py-2.5 text-slate-400 font-medium text-xs uppercase tracking-wider w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => (
                    <tr key={m.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{m.id}</td>
                      <td className="px-4 py-2.5 text-slate-200">{m.nombre}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          m.habilitado === 'Y'
                            ? 'bg-emerald-900/30 text-emerald-400'
                            : 'bg-red-900/30 text-red-400'
                        }`}>
                          {m.habilitado === 'Y' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSlidePanel({ open: true, mode: 'edit', data: m })}
                            className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-teal-400 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(m)}
                            className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && (
        <p className="text-xs text-slate-500 text-center">
          {maestros.length} registro{maestros.length !== 1 ? 's' : ''} en {Object.keys(grouped).length} grupo{Object.keys(grouped).length !== 1 ? 's' : ''}
        </p>
      )}

      {/* SlidePanel */}
      </div>

      <SlidePanel
        open={slidePanel.open}
        onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        title={slidePanel.mode === 'create' ? 'Nuevo Maestro' : 'Editar Maestro'}
        mode="split"
      >
        <MaestroForm
          initialData={slidePanel.data}
          onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        />
      </SlidePanel>
    </div>
  )
}
