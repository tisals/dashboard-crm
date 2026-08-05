import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getMyAppPermissions } from '../api/crmApi'
import type { MyAppDetail } from '../api/types'
import { Boxes, ChevronRight, Loader2 } from 'lucide-react'

const APP_TIPO_COLORS: Record<string, string> = {
  internal: 'bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25',
  external: 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25',
  customer: 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25',
}

export function MyAppsWidget() {
  const { user, apps, appsLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [detail, setDetail] = useState<MyAppDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Lazy-load detail when an app is selected
  useEffect(() => {
    if (!selectedSlug) {
      setDetail(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    getMyAppPermissions(selectedSlug)
      .then((res) => {
        if (!cancelled) setDetail(res.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedSlug])

  // Don't render for unauthenticated users
  if (!user) return null
  // Don't render the bubble if there are no apps — keeps the header clean
  if (!appsLoading && apps.length === 0) return null

  const selectedApp = apps.find((a) => a.slug === selectedSlug)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition-colors relative"
        aria-label="Mis apps"
        title={`Mis apps (${apps.length})`}
      >
        <Boxes size={20} />
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-teal-600 text-[10px] font-bold text-white flex items-center justify-center">
          {apps.length}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Mis Apps</p>
              <p className="text-xs text-slate-400">
                {appsLoading
                  ? 'Cargando...'
                  : `${apps.length} app${apps.length === 1 ? '' : 's'} disponible${apps.length === 1 ? '' : 's'}`}
              </p>
            </div>
            {appsLoading && <Loader2 size={14} className="animate-spin text-slate-500" />}
          </div>

          {/* App list */}
          <div className="max-h-64 overflow-y-auto p-2">
            {apps.map((app) => {
              const isSelected = app.slug === selectedSlug
              return (
                <button
                  key={app.id}
                  onClick={() =>
                    setSelectedSlug(isSelected ? null : app.slug)
                  }
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                    isSelected
                      ? 'bg-teal-800/30 text-slate-200'
                      : 'text-slate-300 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${
                        APP_TIPO_COLORS[app.tipo] ?? 'bg-slate-700 text-slate-300 border-slate-600'
                      }`}
                    >
                      {app.slug}
                    </span>
                    <span className="truncate">{app.nombre}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 shrink-0">
                    {app.entidades_count} ent.
                  </span>
                </button>
              )
            })}
          </div>

          {/* Detail panel */}
          {selectedApp && (
            <div className="border-t border-slate-700 p-3 bg-slate-900/50">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" />
                  Cargando detalle...
                </div>
              ) : detail ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Acceso por entidad
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {detail.total_entidades} entidad
                      {detail.total_entidades === 1 ? '' : 'es'}
                    </span>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {detail.permisos.map((p) => (
                      <div
                        key={p.entidad_id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-800/50 rounded text-xs"
                      >
                        <span className="text-slate-200 truncate">{p.entidad_nombre}</span>
                        <ChevronRight size={10} className="text-slate-500 shrink-0" />
                      </div>
                    ))}
                    {detail.permisos.length === 0 && (
                      <p className="text-xs text-slate-500">Sin entidades asignadas.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-red-400">No se pudo cargar el detalle.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
