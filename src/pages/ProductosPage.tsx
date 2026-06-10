import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Search, Package, Plus, Pencil, Trash2 } from 'lucide-react'
import { getProductos, deleteProducto } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { ProductoFormModal } from '../components/ProductoFormModal'
import type { Producto } from '../api/types'
import { CommonCard } from '../components/CommonCard'

export function ProductosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 50
  const [slidePanel, setSlidePanel] = useState<{
    open: boolean
    mode: 'create' | 'edit'
    data?: Producto
  }>({ open: false, mode: 'create' })

  const { data: productosData, isLoading } = useQuery({
    queryKey: ['productos', search, page],
    queryFn: () => getProductos({ search: search || undefined, per_page: perPage, page }),
    placeholderData: keepPreviousData,
  })
  const productos = productosData?.data?.data ?? []
  const total = productosData?.data?.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProducto(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
    },
  })

  function handleDelete(producto: Producto) {
    if (window.confirm(`¿Estás seguro de eliminar "${producto.nombre}"?`)) {
      deleteMutation.mutate(producto.id)
    }
  }

  function formatPrice(price?: number): string {
    if (price == null) return '$0'
    return `$${Number(price).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  return (
    <div className="flex gap-0">
      <div className="flex-1 min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Productos</h1>
          <p className="text-slate-400">Catálogo de productos y servicios</p>
        </div>
        <button
          onClick={() => setSlidePanel({ open: true, mode: 'create' })}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
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
            placeholder="Buscar por nombre..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Products List */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 rounded-xl border border-slate-700 p-4 animate-pulse h-32" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <Package size={48} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 text-lg font-medium">No se encontraron productos</p>
            <p className="text-slate-500 text-sm mt-1">
              {search ? 'Probá ajustando la búsqueda' : 'Los productos aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productos.map((p) => (
              <CommonCard
                key={p.id}
                title={p.nombre}
                subtitle={p.linea_negocio || '—'}
                info1={{
                  text: (
                    <span>
                      IVA: {p.iva ?? 0}% ·{' '}
                      <span className="text-teal-400 font-semibold">
                        {formatPrice(p.precio ?? p.vr_unitario)}
                      </span>
                    </span>
                  ),
                }}
                tags={[
                  ...(p.referencia ? [{ label: p.referencia, variant: 'slate' as const }] : []),
                  {
                    label: p.estado,
                    variant: p.estado === 'Activo' ? ('emerald' as const) : ('slate' as const),
                  },
                ]}
                menuItems={[
                  {
                    icon: <Pencil size={14} />,
                    label: 'Editar',
                    onClick: () => setSlidePanel({ open: true, mode: 'edit', data: p }),
                  },
                  {
                    icon: <Trash2 size={14} />,
                    label: 'Eliminar',
                    onClick: () => handleDelete(p),
                    danger: true,
                  },
                ]}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-800 rounded-xl border border-slate-700 p-3">
          <p className="text-xs text-slate-400">
            Mostrando {productos.length} de {total}
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
          {total} producto{total !== 1 ? 's' : ''}
        </p>
      )}

      {/* SlidePanel */}
      </div>

      <SlidePanel
        open={slidePanel.open}
        onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        title={slidePanel.mode === 'create' ? 'Nuevo Producto' : 'Editar Producto'}
        mode="split"
      >
        <ProductoFormModal
          initialData={slidePanel.data}
          onClose={() => setSlidePanel({ open: false, mode: 'create' })}
        />
      </SlidePanel>
    </div>
  )
}
