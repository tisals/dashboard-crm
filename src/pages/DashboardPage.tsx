import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  DollarSign,
  Target,
} from 'lucide-react'
import { getDashboard } from '../api/crmApi'
import type { DashboardData } from '../api/types'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'

const ACTIVITY_ICONS: Record<string, string> = {
  llamada: '📞',
  email: '📧',
  reunion: '📅',
  nota: '📝',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800 p-4 rounded-xl border border-slate-700 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
        Error al cargar dashboard. Revisa la conexión con el API.
      </div>
    )
  }

  const { kpi, oportunidades_por_estado, ventas_4_semanas, actividades_recientes } = data

  const kpiItems = [
    {
      label: 'Oportunidades',
      value: kpi.total_oportunidades,
      change: null,
      icon: Target,
    },
    {
      label: 'Tasa Conversión',
      value: `${kpi.tasa_conversion}%`,
      change: null,
      icon: TrendingUp,
    },
    {
      label: 'Ventas Mes',
      value: `$${Number(kpi.ventas_mes).toLocaleString()}`,
      change: null,
      icon: DollarSign,
    },
    {
      label: 'Nuevos Leads',
      value: kpi.nuevos_leads_mes,
      change: null,
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-slate-400">Resumen de tu actividad</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((kpiItem) => {
          const Icon = kpiItem.icon
          return (
            <div key={kpiItem.label} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className="text-teal-500" />
                <p className="text-slate-400 text-sm">{kpiItem.label}</p>
              </div>
              <span className="text-2xl font-bold text-slate-50">{kpiItem.value}</span>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Oportunidades por estado - Bar chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Oportunidades por Estado</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={oportunidades_por_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="estado"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="total" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas 4 semanas - Line chart */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Ventas Últimas 4 Semanas</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventas_4_semanas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="semana"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  axisLine={{ stroke: '#334155' }}
                  width={50}
                  tickFormatter={v => `$${v.toLocaleString()}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ventas']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={{ fill: '#14b8a6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Actividad Reciente</h3>
        <div className="space-y-3">
          {actividades_recientes.length === 0 && (
            <p className="text-slate-500 text-sm">Sin actividad reciente.</p>
          )}
          {actividades_recientes.slice(0, 8).map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-xl"
            >
              <span className="text-lg">{ACTIVITY_ICONS[activity.tipo] ?? '📌'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm truncate">
                  {activity.notas ?? `${activity.tipo}`}
                  {activity.oportunidad_codigo && (
                    <span className="text-teal-400 ml-1">— {activity.oportunidad_codigo}</span>
                  )}
                </p>
                <p className="text-slate-500 text-xs">
                  {activity.autor ?? 'Sistema'} · {timeAgo(activity.fecha)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}