import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Search, MapPin, Plus, Pencil, Trash2 } from 'lucide-react'
import { getCiudades, createCiudad, updateCiudad, deleteCiudad } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { Loader2 } from 'lucide-react'
import type { Ciudad } from '../api/types'

function CiudadForm({ initialData, onClose }: { initialData?: Ciudad; onClose: () => void }) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    cod_municipio: initialData?.cod_municipio ?? '',
    nombre: initialData?.nombre ?? '',
    departamento: initialData?.departamento ?? '',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? updateCiudad(initialData!.cod_municipio, data)
        : createCiudad(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciudades'] })
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
        {isEdit ? 'Editar Ciudad' : 'Nueva Ciudad'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Código Municipio *</label>
          <input
            type="text"
            value={form.cod_municipio}
            onChange={(e) => setForm({ ...form, cod_municipio: e.target.value })}
            required
            disabled={isEdit}
            maxLength={10}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
          />
        </div>
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
          <label className="block text-sm text-slate-400 mb-1">Departamento *</label>
          <input
            type="text"
            value={form.departamento}
            onChange={(e) => setForm({ ...form, departamento: e.target.value })}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Error al guardar. Verificá que el código no esté duplicado.</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Ciudad'}
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

export function CiudadesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50
  const [slidePanel, setSlidePanel] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    data?: Ciudad
  }>({ open: false, mode: 'create' })

  const { data: ciudadesData, isLoading } = useQuery({
    queryKey: ['ciudades', search, page],
    queryFn: () => getCiudades({ search: search || undefined, per_page: perPage, page }),
    placeholderData: keepPreviousData,
  })
  const ciudades = ciudadesData?.data?.data ?? []
  const total = ciudadesData?.data?.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  const deleteMutation = useMutation({
    mutationFn: (codMunicipio: string) => deleteCiudad(codMunicipio),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ciudades'] })
    },
  })

  function handleDelete(c: Ciudad) {
    if (window.confirm(`¿Estás seguro de eliminar "${c.nombre}" (${c.cod_municipio})?`)) {
      deleteMutation.mutate(c.cod_municipio)
    }
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Ciudades</h1>
          <p className="text-slate-400">Listado de ciudades y departamentos</p>
        </div>
        <button
          onClick={() => setSlidePanel({ open: true, mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Ciudad
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por ciudad o departamento..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-16 h-4 bg-slate-700 rounded" />
                <div className="w-32 h-4 bg-slate-700 rounded" />
                <div className="flex-1 h-4 bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        ) : ciudades.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-lg font-medium">No se encontraron ciudades</p>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Probá ajustando la búsqueda' : 'Las ciudades aparecerán aquí'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Código</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Ciudad</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Departamento</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ciudades.map((c) => (
                <tr key={c.cod_municipio} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.cod_municipio}</td>
                  <td className="px-4 py-3 text-slate-200 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 text-slate-400">{c.departamento || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSlidePanel({ open: true, mode: 'edit', data: c })}
                        className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-teal-400 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800 rounded-xl border border-slate-700 p-3">
          <p className="text-xs text-slate-400">
            Mostrando {ciudades.length} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs rounded bg-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-600"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs rounded bg-slate-700 text-slate-300 disabled:opacity-50 hover:bg-slate-600"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      {!isLoading && (
        <p className="text-xs text-slate-500 text-center">
          {total} ciudad{total !== 1 ? 'es' : ''}
        </p>
      )}

      {/* SlidePanel */}
      </div>

      <SlidePanel
        open={slidePanel.open}
        onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        title={slidePanel.mode === 'create' ? 'Nueva Ciudad' : 'Editar Ciudad'}
        mode="split"
      >
        <CiudadForm
          initialData={slidePanel.data}
          onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        />
      </SlidePanel>
    </div>
  )
}
