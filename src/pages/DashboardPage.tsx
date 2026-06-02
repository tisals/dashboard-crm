import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
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
  ComposedChart,
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

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#e2e8f0',
}

function currency(value: number) {
  return `$${value.toLocaleString('es-CO')}`
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
  })

  const ventasPorMes = useMemo(() => {
    if (!data) return []
    return Object.entries(data.ventas.ventas_por_mes).map(([mes, total]) => ({
      mes,
      ventas: total,
    }))
  }, [data])

  const chartCombo = useMemo(() => {
    if (!data) return []
    return data.chart.meses.map((mes, i) => ({
      mes,
      clientes: data.chart.entidades_convertidas[i],
      ventas: data.chart.ventas[i],
    }))
  }, [data])

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

  if (error || !data) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
        Error al cargar dashboard. Revisa la conexión con el API.
      </div>
    )
  }

  const { prospectos, ventas, chart: chartData, actividades_recientes } = data

  const kpiItems = [
    {
      label: 'Nuevos Leads',
      value: prospectos.nuevos_leads_mes,
      icon: Users,
    },
    {
      label: 'Tasa Conversión',
      value: `${prospectos.tasa_conversion}%`,
      icon: TrendingUp,
    },
    {
      label: 'Ventas Mes',
      value: currency(ventas.ventas_mes),
      icon: DollarSign,
    },
    {
      label: 'LTV Promedio',
      value: currency(ventas.ltv),
      icon: Target,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Dashboard</h1>
        <p className="text-slate-400">Resumen de tu actividad</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className="text-teal-500" />
                <p className="text-slate-400 text-sm">{item.label}</p>
              </div>
              <span className="text-2xl font-bold text-slate-50">{item.value}</span>
            </div>
          )
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Oportunidades por estado */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Oportunidades por Estado</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prospectos.oportunidades_por_estado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="estado" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ventas por Mes */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Ventas por Mes</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ventasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={50} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [currency(value), 'Ventas']} />
                <Line type="monotone" dataKey="ventas" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Clientes convertidos + Ventas (12 meses) */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Clientes Nuevos vs Ventas</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartCombo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={50} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar yAxisId="left" dataKey="clientes" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Clientes" />
                <Line yAxisId="right" type="monotone" dataKey="ventas" stroke="#14b8a6" strokeWidth={2} dot={false} name="Ventas" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel (oportunidades por estado con montos) */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Funnel de Ventas</h3>
          <div className="space-y-2">
            {ventas.funnel.map((item) => {
              const pct = ventas.funnel.length > 0
                ? Math.round((item.total / Math.max(...ventas.funnel.map(f => f.total))) * 100)
                : 0
              return (
                <div key={item.estado}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 capitalize">{item.estado}</span>
                    <span className="text-slate-400">
                      {item.total} · {currency(item.monto)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {ventas.funnel.length === 0 && (
              <p className="text-slate-500 text-sm">Sin datos de funnel</p>
            )}
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
