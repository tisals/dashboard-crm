import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getMarcas, deleteEntidad } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { MarcaFormModal } from '../components/MarcaFormModal'
import { Pencil, Trash2, Plus, Search } from 'lucide-react'
import type { Entidad } from '../api/types'

export function MarcasPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50
  const [slidePanel, setSlidePanel] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    data?: Entidad
  }>({ open: false, mode: 'create' })

  const { data, isLoading } = useQuery({
    queryKey: ['marcas', search, page],
    queryFn: () => getMarcas({ search, per_page: perPage, page }),
    placeholderData: keepPreviousData,
  })

  const marcas = data?.data?.data ?? []
  const total = data?.data?.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEntidad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] })
    },
  })

  function handleDelete(id: number, nombre: string) {
    if (window.confirm(`¿Estás seguro de eliminar la marca "${nombre}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Marcas / Propia</h1>
            <p className="text-slate-400">Gestión de entidades internas de la empresa</p>
          </div>
          <button
            onClick={() => setSlidePanel({ open: true, mode: 'create' })}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva Marca
          </button>
        </div>

        {/* Search */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar marcas..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : marcas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500">No hay marcas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase">Nombre</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase">Identificación</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase">Dominio</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase">Ciudad</th>
                    <th className="text-left p-3 text-xs font-medium text-slate-400 uppercase">Email</th>
                    <th className="text-right p-3 text-xs font-medium text-slate-400 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {marcas.map((marca: Entidad) => (
                    <tr key={marca.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-3 text-sm text-slate-200 font-medium">{marca.nombre}</td>
                      <td className="p-3 text-sm text-slate-400">{marca.identificacion ?? '—'}</td>
                      <td className="p-3 text-sm text-slate-400">{marca.dominio ?? '—'}</td>
                      <td className="p-3 text-sm text-slate-400">{marca.ciudad_cod ?? '—'}</td>
                      <td className="p-3 text-sm text-slate-400">{marca.email ?? '—'}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSlidePanel({ open: true, mode: 'edit', data: marca })}
                            className="p-1.5 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-teal-400 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(marca.id, marca.nombre)}
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
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-slate-700">
              <p className="text-xs text-slate-400">
                Mostrando {marcas.length} de {total}
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
        </div>
      </div>

      {/* SlidePanel — split mode (content shrinks) */}
      <SlidePanel
        open={slidePanel.open}
        onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        title={slidePanel.mode === 'create' ? 'Nueva Marca' : 'Editar Marca'}
        mode="split"
      >
        <MarcaFormModal
          initialData={slidePanel.data}
          onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        />
      </SlidePanel>
    </div>
  )
}
