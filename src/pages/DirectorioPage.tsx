import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  Pencil,
  ChevronDown,
  Trash2,
  MapPin,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import {
  getEntidades,
  getContactos,
  getSeguimientos,
  getOportunidades,
  deleteContacto,
  deleteEntidad,
} from '../api/crmApi';
import { useAuth } from '../context/AuthContext';
import { ContactCard } from '../components/ContactCard';
import { ContactoFormModal } from '../components/ContactoFormModal';
import { EntidadFormModal } from '../components/EntidadFormModal';
import { CommonCard } from '../components/CommonCard';
import { SeguimientoModal } from '../components/SeguimientoModal';
import { SlidePanel } from '../components/SlidePanel';
import type { Contacto, Entidad } from '../api/types';

const PER_PAGE = 50;

export function DirectorioPage() {
  /* ----------   STATE   ---------- */
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Prospecto,Cliente');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [showEntidadForm, setShowEntidadForm] = useState(false);
  const [showEditEntidad, setShowEditEntidad] = useState(false);
  const [editEntidad, setEditEntidad] = useState<Entidad | null>(null);
  const [showContactoForm, setShowContactoForm] = useState(false);
  const [editContacto, setEditContacto] = useState<Contacto | null>(null);
  const [seguimientoEntidad, setSeguimientoEntidad] = useState<Entidad | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  /* ----------   AUTH   ---------- */
  const { user } = useAuth();
  const isAdmin = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin';

  /* ----------   MUTATIONS   ---------- */
  const deleteEntidadMut = useMutation({
    mutationFn: deleteEntidad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidades'] });
      setSelectedEntityId(null);
      setDetailOpen(false);
    },
  });

  const {
    data: entidadesPages,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['entidades', search, estadoFilter, sortBy, sortOrder],
    queryFn: async ({ pageParam = 1 }) => {
      return await getEntidades({
        search: search || undefined,
        estado: estadoFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        per_page: PER_PAGE,
        page: pageParam,
      });
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.data?.total ?? 0;
      const loaded = allPages.length * PER_PAGE;
      return loaded < total ? allPages.length + 1 : undefined;
    },
  });
    const entidades: Entidad[] =
    entidadesPages?.pages.flatMap((p) => p.data?.data ?? []) ?? [];
  const totalEntidades = entidadesPages?.pages[0]?.data?.total ?? 0;
  /* ----------   HELPERS   ---------- */
  const selectedEntity = entidades.find(
    (e) => Number(e.id) === (selectedEntityId ?? NaN)
  );

  function handleView(entity: Entidad) {
    setSelectedEntityId(Number(entity.id));
    setDetailOpen(true);
  }

  function handleDeleteEntidad(entity: Entidad) {
    if (window.confirm(`¿Eliminar la entidad "${entity.nombre}"? Esta acción no se puede deshacer.`)) {
      deleteEntidadMut.mutate(entity.id);
    }
  }

  /* ----------   EFFECTS   ---------- */
  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) setSearch(urlSearch);
  }, [searchParams]);

  /* ----------   QUERIES   ---------- */

  
  const { data: contactosData } = useQuery({
    queryKey: ['contactos', 'byEntidad', selectedEntityId],
    queryFn: () => getContactos({ entidad_id: selectedEntityId!, per_page: 50 }),
    enabled: !!selectedEntityId,
  });

  const { data: seguimientosData } = useQuery({
    queryKey: ['seguimientos', 'byEntidad', selectedEntityId],
    queryFn: () => getSeguimientos({ entidad_id: selectedEntityId!, per_page: 5 }),
    enabled: !!selectedEntityId,
  });

  const contactos = contactosData?.data?.data ?? [];
  const seguimientos = seguimientosData?.data?.data ?? [];

  const { data: oportunidadesData } = useQuery({
    queryKey: ['oportunidades', 'byEntidad', selectedEntityId],
    queryFn: () => getOportunidades({ entidad_id: selectedEntityId!, per_page: 10 }),
    enabled: !!selectedEntityId,
  });

  const oportunidades = oportunidadesData?.data?.data ?? [];

  /* ----------   UI   ---------- */
  return (
    <div className="flex gap-0">
      {/* MAIN LIST */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Directorio</h1>
            <p className="text-slate-400">Empresas y organizaciones</p>
          </div>
          <button
            onClick={() => setShowEntidadForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors"
          >
            <Plus size={18} />
            Nueva Entidad
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4 mt-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar entidades por nombre o identificación..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 min-w-[180px]"
          >
            <option value="Prospecto,Cliente">Prospectos y Clientes</option>
            <option value="Prospecto">Solo Prospectos</option>
            <option value="Cliente">Solo Clientes</option>
            <option value="Propia">Propia</option>
            <option value="Inactivo">Inactivos</option>
            <option value="">Todos</option>
          </select>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [b, o] = e.target.value.split(':');
              setSortBy(b);
              setSortOrder(o);
            }}
            className="px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 min-w-[180px]"
          >
            <option value="created_at:desc">Más recientes</option>
            <option value="created_at:asc">Más antiguos</option>
            <option value="updated_at:desc">Última actualización</option>
            <option value="updated_at:asc">Primera actualización</option>
            <option value="nombre:asc">A - Z</option>
            <option value="nombre:desc">Z - A</option>
          </select>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                    <div className="h-3 bg-slate-700 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))
          ) : entidades.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Building2 className="mx-auto text-slate-600 mb-3" size={48} />
              <p className="text-slate-400">No se encontraron entidades</p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-2 text-teal-400 hover:text-teal-300 text-sm"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            entidades.map((entity) => (
              <CommonCard
                key={entity.id}
                onClick={() => handleView(entity)}
                title={entity.nombre}
                subtitle={entity.identificacion}
                info1={
                  entity.ciudad_nombre
                    ? { icon: <MapPin size={12} />, text: entity.ciudad_nombre }
                    : undefined
                }
                info2={
                  entity.direccion
                    ? { icon: <MapPin size={12} />, text: entity.direccion }
                    : undefined
                }
                tags={[
                  {
                    label: entity.estado,
                    variant:
                      entity.estado === 'Activo' || entity.estado === 'Propia'
                        ? 'emerald'
                        : entity.estado === 'Prospecto'
                        ? 'blue'
                        : 'slate',
                  },
                  { label: entity.tipo_persona, variant: 'slate' },
                  ...(entity.oportunidades_count != null
                    ? [{ label: `${entity.oportunidades_count} Ops`, variant: 'amber' as const }]
                    : []),
                  ...(entity.contactos_count != null
                    ? [{ label: `${entity.contactos_count} Contactos`, variant: 'purple' as const }]
                    : []),
                ]}
                menuItems={[
                  {
                    icon: <MessageSquare size={14} />,
                    label: 'Seguimiento',
                    onClick: () => setSeguimientoEntidad(entity),
                  },
                  {
                    icon: <Pencil size={14} />,
                    label: 'Editar',
                    onClick: () => {
                      setEditEntidad(entity);
                      setShowEditEntidad(true);
                      setSelectedEntityId(null);
                      setDetailOpen(false);
                    },
                  },
                  {
                    icon: <UserPlus size={14} />,
                    label: 'Asignar contacto',
                    onClick: () => {
                      setSelectedEntityId(entity.id);
                      setShowContactoForm(true);
                    },
                  },
                  ...(isAdmin
                    ? [
                        {
                          icon: <Trash2 size={14} />,
                          label: 'Eliminar',
                          onClick: () => handleDeleteEntidad(entity),
                          danger: true,
                        },
                      ]
                    : []),
                ]}
              />
            ))
          )}
        </div>

        {/* Load more */}
        {!isLoading && entidades.length > 0 && hasNextPage && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl border border-slate-600 text-sm font-medium transition-colors"
            >
              {isFetchingNextPage ? 'Cargando...' : (
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
            {entidades.length} de {totalEntidades} entidad{totalEntidades !== 1 ? 'es' : ''}
          </p>
        )}
      </div>

      {/* PANEL */}
      {detailOpen && (
        <SlidePanel
          open={detailOpen}
          title={selectedEntity?.nombre ?? 'Detalle'}

          width="w-full md:w-[30%]"
          onClose={() => {
            setDetailOpen(false);
            setSelectedEntityId(null);
          }}
        >

          {/* Entity Info */}
          {selectedEntity && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-teal-800 flex items-center justify-center text-teal-400 shrink-0">
                  <Building2 size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-slate-200 truncate">
                    {selectedEntity.nombre}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {selectedEntity.identificacion}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditEntidad(selectedEntity!);
                      setShowEditEntidad(true);
                      setDetailOpen(false);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={15} />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteEntidad(selectedEntity!)}
                      disabled={deleteEntidadMut.isPending}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  selectedEntity.estado === 'Activo'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : selectedEntity.estado === 'Prospecto'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-600 text-slate-400'
                }`}>
                  {selectedEntity.estado}
                </span>
                <span className="px-2 py-1 rounded-lg text-xs font-medium bg-slate-700 text-slate-300">
                  {selectedEntity.tipo_persona}
                </span>
              </div>
              {selectedEntity.email && (
                <div className="mt-3 flex items-center gap-2 text-slate-400 text-sm">
                  <Mail size={14} />
                  <span>{selectedEntity.email}</span>
                </div>
              )}
              {selectedEntity.telefono && (
                <div className="mt-1 flex items-center gap-2 text-slate-400 text-sm">
                  <Phone size={14} />
                  <span>{selectedEntity.telefono}</span>
                </div>
              )}
              {selectedEntity.nombre_comercial && (
                <div className="mt-1 flex items-center gap-2 text-slate-400 text-sm">
                  <Building2 size={14} />
                  <span className="text-slate-300">{selectedEntity.nombre_comercial}</span>
                </div>
              )}
              {selectedEntity.direccion && (
                <div className="mt-1 flex items-center gap-2 text-slate-400 text-sm">
                  <span className="w-1 h-1 rounded-full bg-slate-500" />
                  <span>{selectedEntity.direccion}</span>
                </div>
              )}
            </div>
          )}

          {/* Contacts */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500" />
                Contactos ({contactos.length})
              </h3>
              <button
                onClick={() => setShowContactoForm(true)}
                className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-teal-400"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {contactos.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No hay contactos registrados
                </p>
              ) : (
                contactos.map((contacto) => (
                  <ContactCard
                    key={contacto.id}
                    contacto={contacto}
                    entidadId={selectedEntityId ?? undefined}
                    onLogged={() => {
                      queryClient.invalidateQueries({ queryKey: ['contactos'] });
                      queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
                    }}
                    onEdit={(c) => {
                      setEditContacto(c);
                      setShowContactoForm(true);
                    }}
                    onDelete={
                      isAdmin
                        ? (c) => {
                            if (
                              window.confirm(`¿Eliminar contacto ${c.nombres} ${c.apellidos}?`)
                            ) {
                              deleteContacto(c.id).then(() => {
                                queryClient.invalidateQueries({
                                  queryKey: ['contactos'],
                                });
                              });
                            }
                          }
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Opportunities */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Oportunidades ({oportunidades.length})
            </h3>
            <div className="space-y-2">
              {oportunidades.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No hay oportunidades registradas
                </p>
              ) : (
                oportunidades.map((op) => (
                  <div
                    key={op.id}
                    onClick={() => navigate(`/crm?oportunidad_id=${op.id}`)}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-3 cursor-pointer hover:border-teal-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-200">
                        {op.codigo}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        op.estado === 'Ganada'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : op.estado === 'Aceptada'
                          ? 'bg-purple-500/20 text-purple-400'
                          : op.estado === 'Enviada'
                          ? 'bg-blue-500/20 text-blue-400'
                          : op.estado === 'Borrador'
                          ? 'bg-slate-600 text-slate-300'
                          : op.estado === 'Perdida' || op.estado === 'Rechazada'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-slate-600 text-slate-300'
                      }`}>
                        {op.estado}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {new Date(op.fecha).toLocaleDateString('es-ES')}
                      </span>
                      {op.valor != null && (
                        <span className="text-xs font-medium text-slate-300">
                          ${op.valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Follow‑ups */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Seguimientos recientes
            </h3>
            <div className="space-y-2">
              {seguimientos.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">
                  No hay seguimientos registrados
                </p>
              ) : (
                seguimientos.map((seguimiento) => (
                  <div
                    key={seguimiento.id}
                    className="bg-slate-800 rounded-lg border border-slate-700 p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        seguimiento.tipo === 'Llamada'
                          ? 'bg-green-500/20 text-green-400'
                          : seguimiento.tipo === 'Correo'
                          ? 'bg-blue-500/20 text-blue-400'
                          : seguimiento.tipo === 'Reunion'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-slate-600 text-slate-300'
                      }`}>
                        {seguimiento.tipo}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(seguimiento.fecha).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    {seguimiento.notas && (
                      <p className="text-xs text-slate-400 line-clamp-2">{seguimiento.notas}</p>
                    )}
                    {seguimiento.autor_nombre && (
                      <p className="text-xs text-slate-500 mt-1">Por {seguimiento.autor_nombre}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </SlidePanel>
      )}


      {/* Modals */}
      {showEntidadForm && (
        <EntidadFormModal
          mode="split"
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['entidades'] });
            setShowEntidadForm(false);
          }}
          onClose={() => setShowEntidadForm(false)}
        />
      )}
      {showEditEntidad && editEntidad && (
        <EntidadFormModal
          mode="split"
          entidad={editEntidad}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['entidades'] });
            setShowEditEntidad(false);
            setEditEntidad(null);
          }}
          onClose={() => {
            setShowEditEntidad(false);
            setEditEntidad(null);
          }}
        />
      )}
      {showContactoForm && (
        <ContactoFormModal
          mode="split"
          entidadId={selectedEntityId!}
          contacto={editContacto ?? undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['contactos'] });
            setShowContactoForm(false);
            setEditContacto(null);
          }}
          onClose={() => {
            setShowContactoForm(false);
            setEditContacto(null);
          }}
        />
      )}
      {seguimientoEntidad && (
        <SeguimientoModal
          contactoId={seguimientoEntidad.id}
          contactoNombre={seguimientoEntidad.nombre}
          entidadId={seguimientoEntidad.id}
          onClose={() => setSeguimientoEntidad(null)}
          onLogged={() => {
            queryClient.invalidateQueries({ queryKey: ['seguimientos'] });
            queryClient.invalidateQueries({ queryKey: ['contactos'] });
          }}
        />
      )}
    </div>
  );
}