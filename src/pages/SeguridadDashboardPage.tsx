import { useQuery } from '@tanstack/react-query'
import { getSecurityDashboard } from '../api/crmApi'
import { Shield, Users, Package, Flag, UserCog, BookOpen, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function SeguridadDashboardPage() {
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['seguridad-dashboard'],
    queryFn: () => getSecurityDashboard(),
  })

  const dashboard = data?.data
  const kpi = dashboard?.kpi

  const quickLinks = [
    { label: 'Usuarios', icon: UserCog, path: '/usuarios', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    { label: 'Marcas / Propia', icon: Flag, path: '/marcas', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    { label: 'Maestros', icon: BookOpen, path: '/maestros', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    { label: 'Ciudades', icon: MapPin, path: '/ciudades', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { label: 'Productos', icon: Package, path: '/productos', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Seguridad</h1>
        <p className="text-slate-400">Gestión de usuarios, roles, permisos y datos maestros</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">
                {isLoading ? '...' : kpi?.total_usuarios ?? 0}
              </p>
              <p className="text-xs text-slate-400">Usuarios</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">
                {isLoading ? '...' : kpi?.usuarios_activos ?? 0}
              </p>
              <p className="text-xs text-slate-400">Usuarios Activos</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <Package className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">
                {isLoading ? '...' : kpi?.total_productos ?? 0}
              </p>
              <p className="text-xs text-slate-400">Productos</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Flag className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-50">
                {isLoading ? '...' : kpi?.total_marcas ?? 0}
              </p>
              <p className="text-xs text-slate-400">Marcas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Access */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">
            Acceso Rápido
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`flex items-center gap-2 p-3 rounded-lg border ${link.color} hover:brightness-110 transition-all text-left`}
              >
                <link.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Distribución de Roles */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">
            Distribución de Roles
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : dashboard?.distribucion_roles && dashboard.distribucion_roles.length > 0 ? (
            <div className="space-y-2">
              {dashboard.distribucion_roles.map((item) => (
                <div
                  key={item.rol}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-700/50"
                >
                  <span className="text-sm text-slate-300">{item.rol}</span>
                  <span className="text-sm font-bold text-teal-400">{item.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm text-center py-4">Sin datos</p>
          )}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-4">
          Actividad Reciente
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-700 rounded animate-pulse" />
            ))}
          </div>
        ) : dashboard?.actividad_reciente && dashboard.actividad_reciente.length > 0 ? (
          <div className="space-y-2">
            {dashboard.actividad_reciente.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    act.tipo === 'created' ? 'bg-emerald-500/20 text-emerald-400' :
                    act.tipo === 'updated' ? 'bg-blue-500/20 text-blue-400' :
                    act.tipo === 'deleted' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {act.tipo === 'created' ? 'CREADO' :
                     act.tipo === 'updated' ? 'ACTUALIZADO' :
                     act.tipo === 'deleted' ? 'ELIMINADO' :
                     act.tipo === 'login' ? 'LOGIN' : act.tipo.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-300 truncate max-w-[200px]">
                    {act.descripcion}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{act.usuario}</p>
                  <p className="text-xs text-slate-500">{act.fecha} {act.hora ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-4">Sin actividad reciente</p>
        )}
      </div>
    </div>
  )
}
