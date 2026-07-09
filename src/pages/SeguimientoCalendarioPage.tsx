import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MessageSquare,
  Briefcase,
  Building2,
} from 'lucide-react'
import { getSeguimientos, getUsuarios } from '../api/crmApi'
import type { Seguimiento } from '../api/types'
import { useAuth } from '../context/AuthContext'

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Return the Monday of the week containing the given date. */
function mondayOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon...
  const diff = day === 0 ? -6 : 1 - day // Monday-based
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Return YYYY-MM-DD from a Date. */
function fmtDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Shift week by delta weeks. */
function shiftWeek(monday: Date, delta: number): Date {
  const d = new Date(monday)
  d.setDate(d.getDate() + delta * 7)
  return d
}

/** Build the week array (Mon..Sun) for a given Monday. */
function buildWeek(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function SeguimientoCalendarioPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin'

  const [currentMonday, setCurrentMonday] = useState(() => mondayOfWeek(new Date()))

  // Fetch seguimientos — same endpoint as the list view for consistency.
  // Admin sees all (no user filter), non-admin sees their own.
  const { data: seguimientosData, isLoading } = useQuery({
    queryKey: isAdmin
      ? ['seguimientos', 'admin-calendar']
      : ['seguimientos', 'mios-calendar', user?.id],
    queryFn: () =>
      isAdmin
        ? getSeguimientos({ per_page: 200 })
        : getSeguimientos({ per_page: 200 }),
    enabled: !!user,
  })

  const allSeguimientos: Seguimiento[] = (seguimientosData?.data as any)?.data ?? []

  // Fetch user list for admin picker
  const { data: usuariosRes } = useQuery({
    queryKey: ['usuarios', 'list-active'],
    queryFn: () => getUsuarios({ per_page: 100 }),
    enabled: isAdmin,
  })
  const availableUsers: { id: number; nombre: string }[] = ((usuariosRes?.data as any)?.data as any[])?.map((u: any) => ({ id: u.id, nombre: u.nombre })) ?? [] 

  const [filterUserId, setFilterUserId] = useState<number | null>(null)

  // Filter by selected user if admin picker is used
  const filtered = useMemo(() => {
    if (!filterUserId) return allSeguimientos
    return allSeguimientos.filter(s => s.autor_id === filterUserId)
  }, [allSeguimientos, filterUserId])

  // Group by day
  const diasAgrupados = useMemo(() => {
    const map: Record<string, Seguimiento[]> = {}
    for (const s of filtered) {
      // Normalize date: backend may return ISO string or plain date
      const day = s.fecha.slice(0, 10)
      if (!map[day]) map[day] = []
      map[day].push(s)
    }
    return map
  }, [filtered])

  const week = buildWeek(currentMonday)
  const weekStart = fmtDate(week[0])
  const weekEnd = fmtDate(week[6])

  // Count total in this week
  const totalInWeek = week.reduce((acc, d) => {
    const key = fmtDate(d)
    return acc + (diasAgrupados[key]?.length ?? 0)
  }, 0)

  // Week label
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const weekLabel = `${week[0].getDate()} ${monthNames[week[0].getMonth()]} - ${week[6].getDate()} ${monthNames[week[6].getMonth()]} ${week[6].getFullYear()}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/seguimientos"
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Volver a lista"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Calendario Semanal</h1>
            <p className="text-slate-400">
              {weekLabel} · {totalInWeek} seguimientos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin user filter */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-slate-500" />
              <select
                value={filterUserId ?? ''}
                onChange={(e) => setFilterUserId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
              >
                <option value="">Todos los usuarios</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setCurrentMonday(m => shiftWeek(m, -1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Semana anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMonday(mondayOfWeek(new Date()))}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMonday(m => shiftWeek(m, 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Semana siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekly grid */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-700">
          {DAY_LABELS.map((label, i) => {
            const d = week[i]
            const isToday = fmtDate(d) === new Date().toISOString().slice(0, 10)
            return (
              <div
                key={label}
                className={`px-2 py-2 text-center border-r last:border-r-0 border-slate-700/50 ${
                  isToday ? 'bg-teal-900/30' : ''
                }`}
              >
                <div className={`text-[10px] font-semibold uppercase tracking-wide ${
                  i >= 5 ? 'text-slate-500' : 'text-slate-400'
                }`}>
                  {label}
                </div>
                <div className={`text-sm font-bold mt-0.5 ${
                  isToday ? 'text-teal-300' : 'text-slate-200'
                }`}>
                  {d.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Cargando...</div>
        ) : totalInWeek === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <CalendarIcon size={40} className="mx-auto text-slate-600 mb-2" />
            <p>No hay seguimientos esta semana</p>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {week.map((d, colIdx) => {
              const key = fmtDate(d)
              const items = diasAgrupados[key] ?? []
              const isToday = key === new Date().toISOString().slice(0, 10)
              return (
                <div
                  key={colIdx}
                  className={`min-h-[200px] border-r last:border-r-0 border-slate-700/50 p-2 ${
                    isToday ? 'bg-teal-900/10' : 'bg-slate-800/30'
                  }`}
                >
                  {items.length > 0 && (
                    <div className="space-y-1.5">
                      {items.map((s) => {
                        const tipoIcon = s.tipo === 'Llamada' ? <Phone size={11} /> :
                          s.tipo === 'Correo' ? <Mail size={11} /> :
                          s.tipo === 'Reunion' ? <CalendarIcon size={11} /> :
                          <MessageSquare size={11} />
                        return (
                          <div
                            key={s.id}
                            className={`group text-[11px] px-2 py-1.5 rounded-lg border cursor-default transition-colors ${
                              s.estado === 'Completado'
                                ? 'bg-emerald-900/20 border-emerald-800/30 text-emerald-300'
                                : s.estado === 'Cancelado'
                                ? 'bg-red-900/20 border-red-800/30 text-red-300'
                                : 'bg-slate-700/60 border-slate-600/50 text-slate-200 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-medium">
                              {tipoIcon}
                              <span className="truncate">{s.tipo}</span>
                              {s.hora && <span className="text-slate-400 ml-auto">{s.hora.slice(0, 5)}</span>}
                            </div>
                            {s.entidad_nombre && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5 truncate">
                                <Building2 size={9} />
                                {s.entidad_nombre}
                              </div>
                            )}
                            {s.oportunidad_codigo && (
                              <div className="flex items-center gap-1 text-[10px] text-amber-400/70 mt-0.5 truncate">
                                <Briefcase size={9} />
                                {s.oportunidad_codigo}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
