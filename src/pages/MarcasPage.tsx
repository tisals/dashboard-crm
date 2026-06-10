import { useState } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { getMarcas, deleteEntidad, createContacto } from '../api/crmApi'
import { SlidePanel } from '../components/SlidePanel'
import { MarcaFormModal } from '../components/MarcaFormModal'
import { ContactoFormModal } from '../components/ContactoFormModal'
import { SeguimientoModal } from '../components/SeguimientoModal'
import { CommonCard } from '../components/CommonCard'
import { Pencil, Trash2, Plus, Search, MapPin, User, Building2, MessageSquare, UserPlus } from 'lucide-react'
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
  const [seguimientoMarca, setSeguimientoMarca] = useState<Entidad | null>(null)
  const [showContactoForm, setShowContactoForm] = useState(false)
  const [selectedMarcaId, setSelectedMarcaId] = useState<number | null>(null)
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

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-slate-800 rounded-xl border border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : marcas.length === 0 ? (
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center">
            <Building2 className="mx-auto text-slate-600 mb-3" size={48} />
            <p className="text-slate-400">No hay marcas registradas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marcas.map((marca: Entidad) => (
              <CommonCard
                key={marca.id}
                title={marca.nombre}
                subtitle={marca.identificacion || 'NIT no registrado'}
                avatarText={marca.nombre.charAt(0)}
                avatarColor="bg-teal-850 text-teal-400"
                info1={marca.ciudad_nombre ? { icon: <MapPin size={12} />, text: marca.ciudad_nombre } : undefined}
                info2={{ icon: <User size={12} />, text: marca.comercial_asignado || 'Sin asignar' }}
                tags={[
                  { label: marca.estado, variant: 'emerald' },
                  { label: `${marca.oportunidades_count ?? 0} Ops`, variant: 'amber' },
                  { label: `${marca.contactos_count ?? 0} Contactos`, variant: 'purple' },
                ]}
                actions={[
                  <button
                    key="seg"
                    onClick={() => setSeguimientoMarca(marca)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-teal-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <MessageSquare size={13} />
                    <span>Seguimiento</span>
                  </button>
                ]}
                menuItems={[
                  {
                    icon: <Pencil size={14} />,
                    label: 'Editar',
                    onClick: () => setSlidePanel({ open: true, mode: 'edit', data: marca })
                  },
                  {
                    icon: <UserPlus size={14} />,
                    label: 'Asignar contacto',
                    onClick: () => { setSelectedMarcaId(marca.id); setShowContactoForm(true) }
                  },
                  {
                    icon: <Trash2 size={14} />,
                    label: 'Eliminar',
                    onClick: () => handleDelete(marca.id, marca.nombre),
                    danger: true
                  }
                ]}
              />
            ))}
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

      {showContactoForm && (
        <ContactoFormModal
          mode="split"
          entidadId={selectedMarcaId!}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['marcas'] }); setShowContactoForm(false); setSelectedMarcaId(null) }}
          onClose={() => { setShowContactoForm(false); setSelectedMarcaId(null) }}
        />
      )}

      {seguimientoMarca && (
        <SeguimientoModal
          entidadId={seguimientoMarca.id}
          onClose={() => setSeguimientoMarca(null)}
          onLogged={() => {
            queryClient.invalidateQueries({ queryKey: ['marcas'] })
          }}
        />
      )}
    </div>
  )
}
