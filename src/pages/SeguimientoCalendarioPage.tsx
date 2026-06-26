import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users } from 'lucide-react'
import { getCalendarioUsuario, getUsuarios } from '../api/crmApi'
import type { Seguimiento } from '../api/types'
import { getMonthMatrix, dateKey, shiftMonth } from '../utils/calendar'
import { useAuth } from '../context/AuthContext'

const DAYS_OF_WEEK = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function SeguimientoCalendarioPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol_slug === 'admin' || user?.rol_slug === 'super_admin'

  // currentMes format: YYYY-MM
  const [currentMes, setCurrentMes] = useState(() => new Date().toISOString().slice(0, 7))

  // Non-admin: auto-set to own user (calendar loads immediately).
  // Admin: defaults to own ID (shows ALL seguimientos because scopeByUser
  // passes through for admin role), user picker overrides.
  const [selectedUsuarioId, setSelectedUsuarioId] = useState<number | null>(
    user?.id ?? null,
  )
  // Sync when auth loads (e.g. page refresh where user resolves async)
  useEffect(() => {
    if (user?.id && selectedUsuarioId === null) {
      setSelectedUsuarioId(user.id)
    }
  }, [user?.id])

  // Fetch user list for admin picker
  const { data: usuariosRes } = useQuery({
    queryKey: ['usuarios', 'list-active'],
    queryFn: () => getUsuarios({ per_page: 100 }),
    enabled: isAdmin,
  })
  const availableUsers: { id: number; nombre: string }[] = (usuariosRes?.data as any[])?.map((u: any) => ({ id: u.id, nombre: u.nombre })) ?? []

  const { data, isLoading } = useQuery({
    queryKey: ['calendario', selectedUsuarioId, currentMes],
    queryFn: () => getCalendarioUsuario(selectedUsuarioId ?? 0, currentMes),
    enabled: selectedUsuarioId !== null,
  })

  const [year, month] = currentMes.split('-').map(Number) as [number, number]
  const matrix = getMonthMatrix(year, month)

  const diasByKey: Record<string, Seguimiento[]> = (data?.dias as Record<string, Seguimiento[]>) ?? {}

  // Per-day totals for the cell badge
  const totalInMonth = Object.values(diasByKey).reduce((acc, items) => acc + items.length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Calendario de Seguimientos</h1>
          <p className="text-slate-400">
            {currentMes} · {totalInMonth} seguimientos pendientes
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Admin user picker — defaults to own ID (shows ALL), explicit user overrides */}
          {isAdmin && (
            <div className="flex items-center gap-1.5">
              <Users size={16} className="text-slate-500" />
              <select
                value={selectedUsuarioId ?? ''}
                onChange={(e) => setSelectedUsuarioId(e.target.value ? Number(e.target.value) : user!.id)}
                className="px-3 py-2 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
              >
                <option value={user!.id}>Todos los usuarios</option>
                {availableUsers.filter(u => u.id !== user!.id).map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setCurrentMes((m) => shiftMonth(m, -1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => setCurrentMes(new Date().toISOString().slice(0, 7))}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-sm transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => setCurrentMes((m) => shiftMonth(m, 1))}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {/* Day headers (L-D) */}
        <div className="grid grid-cols-7 border-b border-slate-700">
          {DAYS_OF_WEEK.map((d, i) => (
            <div
              key={d}
              className={`px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide ${
                i >= 5 ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Cargando calendario...</div>
        ) : (
          <div className="grid grid-cols-7">
            {matrix.map((row, rowIdx) =>
              row.map((cell, colIdx) => {
                if (!cell) {
                  return <div key={`${rowIdx}-${colIdx}`} className="h-28 bg-slate-900/40 border-r border-b border-slate-700/50" />
                }
                const key = dateKey(cell)
                const items = diasByKey[key] ?? []
                const isToday = key === new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`h-28 border-r border-b border-slate-700/50 p-1.5 overflow-hidden ${
                      isToday ? 'bg-teal-900/20' : 'bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className={`text-xs font-medium ${isToday ? 'text-teal-300' : 'text-slate-400'}`}>
                        {cell.getDate()}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded">
                          {items.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-20">
                      {items.slice(0, 3).map((s) => (
                        <div
                          key={s.id}
                          className="text-[11px] px-1.5 py-0.5 bg-slate-700/60 rounded truncate text-slate-300"
                          title={`${s.tipo}${s.oportunidad_codigo ? ' · ' + s.oportunidad_codigo : ''}${s.entidad_nombre ? ' · ' + s.entidad_nombre : ''}`}
                        >
                          <span className="text-slate-400">{s.hora?.slice(0, 5) ?? ''}</span>{' '}
                          {s.tipo}
                          {s.entidad_nombre ? ` · ${s.entidad_nombre}` : ''}
                        </div>
                      ))}
                      {items.length > 3 && (
                        <div className="text-[10px] text-slate-500 px-1.5">+{items.length - 3} más</div>
                      )}
                    </div>
                  </div>
                )
              }),
            )}
          </div>
        )}
      </div>

      {/* Empty state footer */}
      {!isLoading && totalInMonth === 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <CalendarIcon size={40} className="mx-auto text-slate-600 mb-2" />
          <p className="text-slate-400">No hay seguimientos pendientes en {currentMes}</p>
        </div>
      )}
    </div>
  )
}
