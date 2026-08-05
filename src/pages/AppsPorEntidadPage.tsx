import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, Check, Search, LayoutGrid } from 'lucide-react'
import {
  getApps,
  getEntidades,
  getAppsByEntidad,
  assignAppToEntidad,
  removeAppFromEntidad,
  createApp,
} from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { ConfirmModal } from '../components/ConfirmModal'
import { showToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import type { AppCatalog, AppAsignada, Entidad } from '../api/types'

const APP_TIPO_COLORS: Record<string, string> = {
  internal: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  external: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  customer: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const ASSIGNMENT_ESTADO_COLORS: Record<string, string> = {
  Activo: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Trial: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Suspendido: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Cancelado: 'bg-red-500/20 text-red-300 border-red-500/30',
}

function AppForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    slug: '',
    nombre: '',
    tipo: 'internal' as 'internal' | 'external' | 'customer',
    auth_type: 'sanctum' as 'sanctum' | 'api_key',
    descripcion: '',
  })

  const mutation = useMutation({
    mutationFn: createApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apps'] })
      showToast('App creada en el catálogo', 'success')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al crear la app'
      showToast(msg, 'error')
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-slate-50">Nueva App</h2>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Slug *</label>
        <input
          type="text"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          placeholder="ej: mi-app"
          required
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Nombre *</label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as typeof form.tipo })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="internal">Interna</option>
            <option value="external">Externa</option>
            <option value="customer">Cliente</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Auth</label>
          <select
            value={form.auth_type}
            onChange={(e) => setForm({ ...form, auth_type: e.target.value as typeof form.auth_type })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="sanctum">Sanctum</option>
            <option value="api_key">API Key</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
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
          {mutation.isPending ? 'Creando...' : 'Crear App'}
        </button>
      </div>
    </form>
  )
}

export function AppsPorEntidadPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin'

  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [appFormOpen, setAppFormOpen] = useState(false)
  const [selectedEntidad, setSelectedEntidad] = useState<Entidad | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ entidad: Entidad; app: AppAsignada } | null>(null)

  const { data: appsData } = useQuery({
    queryKey: ['apps', 'all'],
    queryFn: () => getApps({ per_page: 100, activo: true }),
  })
  const apps: AppCatalog[] = appsData?.data?.data ?? []

  const { data: entidadesData } = useQuery({
    queryKey: ['entidades', 'apps-view', search],
    queryFn: () => getEntidades({ search: search || undefined, per_page: 50, estado: 'Prospecto,Cliente,Activo' }),
  })
  const entidades: Entidad[] = entidadesData?.data?.data ?? []

  // For the selected entidad, load its assigned apps
  const { data: appsAsignadasData } = useQuery({
    queryKey: ['entidad-apps', selectedEntidad?.id],
    queryFn: () => getAppsByEntidad(selectedEntidad!.id),
    enabled: !!selectedEntidad,
  })
  const appsAsignadas: AppAsignada[] = appsAsignadasData?.data ?? []
  const assignedAppIds = new Set(appsAsignadas.map((a) => a.id))

  const assignMut = useMutation({
    mutationFn: ({ entidadId, appId }: { entidadId: number; appId: number }) =>
      assignAppToEntidad(entidadId, appId, { estado: 'Activo' }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['entidad-apps', vars.entidadId] })
      showToast('App asignada', 'success')
    },
    onError: () => showToast('Error al asignar la app', 'error'),
  })

  const removeMut = useMutation({
    mutationFn: ({ entidadId, appId }: { entidadId: number; appId: number }) =>
      removeAppFromEntidad(entidadId, appId),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['entidad-apps', vars.entidadId] })
      queryClient.invalidateQueries({ queryKey: ['apps', vars.appId, 'entidades'] })
      showToast('App removida de la entidad', 'success')
      setPendingRemove(null)
    },
    onError: () => showToast('Error al remover la app', 'error'),
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Apps por Entidad</h1>
          <p className="text-slate-400">Administrá qué apps tiene contratadas cada entidad. Los usuarios heredan el acceso transitivamente.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setAppFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Nueva App (catálogo)
          </button>
        )}
      </div>

      {/* Catalog strip */}
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid size={14} className="text-slate-500" />
          <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Catálogo ({apps.length})</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {apps.map((app) => (
            <span
              key={app.id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${APP_TIPO_COLORS[app.tipo] ?? 'bg-slate-700 text-slate-300 border-slate-600'}`}
              title={app.descripcion ?? ''}
            >
              <span className="font-mono">{app.slug}</span>
              <span className="text-slate-400">·</span>
              <span>{app.nombre}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
        <input
          type="text"
          placeholder="Buscar entidad por nombre o identificación..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: entity list */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50">
            <h2 className="text-sm font-semibold text-slate-300">Entidades ({entidades.length})</h2>
          </div>
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-700">
            {entidades.map((e) => {
              const isSelected = selectedEntidad?.id === e.id
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEntidad(e)}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    isSelected ? 'bg-teal-800/30' : 'hover:bg-slate-700/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-200 text-sm font-medium truncate">{e.nombre}</p>
                      <p className="text-slate-500 text-xs truncate">
                        {e.identificacion || '—'} · {e.estado}
                      </p>
                    </div>
                    {isSelected && <Check size={14} className="text-teal-400 shrink-0" />}
                  </div>
                </button>
              )
            })}
            {entidades.length === 0 && (
              <p className="px-4 py-12 text-center text-slate-500 text-sm">Sin entidades.</p>
            )}
          </div>
        </div>

        {/* Right: assignment matrix */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              {selectedEntidad ? `Apps de ${selectedEntidad.nombre}` : 'Seleccioná una entidad'}
            </h2>
            {selectedEntidad && (
              <span className="text-xs text-slate-500">{appsAsignadas.length} asignada{appsAsignadas.length === 1 ? '' : 's'}</span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {!selectedEntidad && (
              <p className="text-center text-slate-500 text-sm py-12">Hacé clic en una entidad para ver/asignar sus apps.</p>
            )}
            {selectedEntidad && apps.map((app) => {
              const isAssigned = assignedAppIds.has(app.id)
              const assigned = appsAsignadas.find((a) => a.id === app.id)
              return (
                <div
                  key={app.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                    isAssigned
                      ? 'bg-teal-900/20 border-teal-700/50'
                      : 'bg-slate-900/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium border ${APP_TIPO_COLORS[app.tipo] ?? ''}`}
                    >
                      {app.slug}
                    </span>
                    <span className="text-slate-200 text-sm truncate">{app.nombre}</span>
                    {isAssigned && assigned && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ASSIGNMENT_ESTADO_COLORS[assigned.estado] ?? ''}`}>
                        {assigned.estado}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isAssigned ? (
                      <button
                        onClick={() => setPendingRemove({ entidad: selectedEntidad, app: assigned! })}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                        title="Remover"
                      >
                        <X size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={() => assignMut.mutate({ entidadId: selectedEntidad.id, appId: app.id })}
                        disabled={assignMut.isPending}
                        className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-slate-800 rounded transition-colors"
                        title="Asignar"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <SlidePanel open={appFormOpen} onClose={() => setAppFormOpen(false)} title="Nueva App">
        <AppForm onClose={() => setAppFormOpen(false)} />
      </SlidePanel>

      <ConfirmModal
        open={!!pendingRemove}
        variant="danger"
        title="Remover app"
        message={
          pendingRemove ? (
            <>
              ¿Remover <strong className="text-slate-100">{pendingRemove.app.nombre}</strong> de <strong className="text-slate-100">{pendingRemove.entidad.nombre}</strong>?
              <br />
              <span className="text-slate-400 text-xs">Los usuarios asignados a esta entidad perderán acceso a la app.</span>
            </>
          ) : null
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        loading={removeMut.isPending}
        onConfirm={() => {
          if (pendingRemove) {
            removeMut.mutate({ entidadId: pendingRemove.entidad.id, appId: pendingRemove.app.id })
          }
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}
