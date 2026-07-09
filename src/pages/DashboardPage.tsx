import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
} from 'lucide-react'
import { getDashboard, getUsuarios } from '../api/crmApi'
import type { DashboardData } from '../api/types'
import {
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Line,
  CartesianGrid,
  ComposedChart,
} from 'recharts'

// Default filter dates
const now = new Date();
const defaultStart = `${now.getFullYear()}-01-01`;
const defaultEnd = now.toISOString().split('T')[0];

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

function toNumber(value: number | string): number {
  return typeof value === 'string' ? parseFloat(value) || 0 : value
}

function currency(value: number | string) {
  const num = toNumber(value)
  return `$${num.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatCurrency(value: number | string) {
  const num = toNumber(value)
  return `$${num.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function DashboardPage() {
  const [comercialId, setComercialId] = useState<number | undefined>()
  const [fechaInicio, setFechaInicio] = useState(defaultStart)
  const [fechaFin, setFechaFin] = useState(defaultEnd)

  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => getUsuarios({ per_page: 100 }),
  })
  const usuarios = usuariosData?.data?.data ?? []

  const filtros = { comercial_id: comercialId, fecha_inicio: fechaInicio || undefined, fecha_fin: fechaFin || undefined }

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard', filtros],
    queryFn: () => getDashboard(filtros),
  })

  const oportunidadesPorMes = useMemo(() => {
    if (!data) return []
    return data.chart.meses.map((mes, i) => ({
      mes,
      prospectos: data.chart.prospectos[i] ?? 0,
      monto: data.chart.montos[i] ?? 0,
    }))
  }, [data])

  const chartCombo = useMemo(() => {
    if (!data) return []
    return data.chart.meses.map((mes, i) => ({
      mes,
      clientes: data.chart.prospectos[i] ?? 0,
      ventas: data.chart.montos[i] ?? 0,
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

  const { prospectos, ventas, comerciales_ventas, actividades_recientes } = data

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
      label: 'Ventas Nuevas Mes',
      value: currency(ventas.ventas_nuevas_mes),
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Comercial</label>
          <select
            value={comercialId ?? ''}
            onChange={e => setComercialId(e.target.value ? Number(e.target.value) : undefined)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm min-w-[180px]"
          >
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Desde</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Hasta</label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {(comercialId || fechaInicio !== defaultStart || fechaFin !== defaultEnd) && (
          <button
            onClick={() => { setComercialId(undefined); setFechaInicio(defaultStart); setFechaFin(defaultEnd) }}
            className="text-sm text-slate-400 hover:text-slate-200 px-2 py-2"
          >
            Limpiar filtros
          </button>
        )}
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
        {/* Clientes Nuevos + Ventas (12 meses) */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Clientes Nuevos vs Ventas</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartCombo}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={60} tickFormatter={v => `$${(v / 1000).toLocaleString('de-DE')}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => name === 'Ventas' ? [currency(value), name] : [value, name]} labelFormatter={label => label} />
                <Bar yAxisId="left" dataKey="clientes" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Clientes" />
                <Line yAxisId="right" type="monotone" dataKey="ventas" stroke="#14b8a6" strokeWidth={2} dot={false} name="Ventas" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Oportunidades por Mes */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Oportunidades por Mes</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={oportunidadesPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="mes" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
                <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={30} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: '#334155' }} width={65} tickFormatter={v => `$${(v / 1000).toLocaleString('de-DE')}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => name === 'Monto' ? [currency(value), name] : [value, name]} labelFormatter={label => label} />
                <Bar yAxisId="left" dataKey="prospectos" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Prospectos" />
                <Line yAxisId="right" type="monotone" dataKey="monto" stroke="#f59e0b" strokeWidth={2} dot={false} name="Monto" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Funnel de Ventas */}
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
                      {item.total} · {formatCurrency(item.monto)}
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

        {/* Ventas por Comercial */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h3 className="text-lg font-semibold text-slate-200 mb-4">Ventas por Comercial</h3>
          <div className="space-y-4">
            {comerciales_ventas.map((c) => {
              const maxVentas = Math.max(...comerciales_ventas.map(cv => cv.total_ventas), 1)
              const pct = Math.round((c.total_ventas / maxVentas) * 100)
              return (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">{c.nombre}</span>
                    <span className="text-slate-400">
                      {c.oportunidades_count} opps · {currency(c.total_ventas)}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-violet-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {comerciales_ventas.length === 0 && (
              <p className="text-slate-500 text-sm">Sin datos de ventas por comercial</p>
            )}
          </div>
        </div>
      </div>

      {/* Actividad Reciente (100% width) */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h3 className="text-lg font-semibold text-slate-200 mb-4">Actividad Reciente</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actividades_recientes.length === 0 && (
            <p className="text-slate-500 text-sm col-span-2">Sin actividad reciente.</p>
          )}
          {actividades_recientes.slice(0, 10).map((activity) => (
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
