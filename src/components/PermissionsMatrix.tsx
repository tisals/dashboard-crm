import { useState, useMemo, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  X,
  RotateCcw,
  ListChecks,
  Trash2,
  Shield,
} from 'lucide-react'
import {
  grantUserAppPermiso,
  revokeUserAppPermiso,
  resetUserAppPermisosToRoleDefaults,
  syncUserAppPermisos,
} from '../api/crmApi'
import { ConfirmModal } from './ConfirmModal'
import { showToast } from './Toast'

interface Props {
  userId: number
  appId: number
  appSlug: string
  appName: string
  initialScopedVistas: string[]
  rolDefaultVistas: string[]
  onChange?: () => void
}

/**
 * PermissionsMatrix — admin UI to manage a single (user, app) permission set.
 *
 * Two columns:
 *   - "Defaults del rol" (read-only) — derived from rol permissions for the app.
 *     Note: the backend doesn't expose this for arbitrary users yet, so the
 *     parent typically passes `[]` and we render a helpful hint instead.
 *   - "Overridden para este usuario" (editable) — current scoped permisos
 *     returned by `GET /usuarios/{userId}/apps/{appId}/permisos`.
 *
 * Below: input + "+ Agregar" for adding a vista, plus a destructive
 * "Reset a defaults del rol" action and a "Sync (replace-all)" modal that
 * takes the complete vistas[] as a textarea (useful for bulk paste).
 */
export function PermissionsMatrix({
  userId,
  appId,
  appSlug: _appSlug,
  appName,
  initialScopedVistas,
  rolDefaultVistas,
  onChange,
}: Props) {
  void _appSlug // Reserved for future per-vista catalogue lookup
  const queryClient = useQueryClient()
  const [scoped, setScoped] = useState<string[]>(initialScopedVistas)
  const [newVista, setNewVista] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncText, setSyncText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local state in sync if parent re-fetches with new data
  useEffect(() => {
    setScoped(initialScopedVistas)
  }, [initialScopedVistas])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users', userId, 'app-permisos', appId] })
    queryClient.invalidateQueries({ queryKey: ['usuarios', userId, 'apps-permisos'] })
    onChange?.()
  }

  const grantMut = useMutation({
    mutationFn: (vista: string) => grantUserAppPermiso(userId, appId, vista),
    onSuccess: (_, vista) => {
      setScoped((prev) => (prev.includes(vista) ? prev : [...prev, vista]))
      showToast(`Permiso "${vista}" otorgado`, 'success')
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al otorgar permiso'
      showToast(msg, 'error')
    },
  })

  const revokeMut = useMutation({
    mutationFn: (vista: string) => revokeUserAppPermiso(userId, appId, vista),
    onSuccess: (_, vista) => {
      setScoped((prev) => prev.filter((v) => v !== vista))
      showToast(`Permiso "${vista}" revocado`, 'success')
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al revocar permiso'
      showToast(msg, 'error')
    },
  })

  const resetMut = useMutation({
    mutationFn: () => resetUserAppPermisosToRoleDefaults(userId, appId),
    onSuccess: (res) => {
      setScoped([])
      showToast(
        `Permisos restablecidos a defaults del rol (${res.removed_count} removidos)`,
        'success',
      )
      setConfirmReset(false)
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al resetear permisos'
      showToast(msg, 'error')
    },
  })

  const syncMut = useMutation({
    mutationFn: (vistas: string[]) => syncUserAppPermisos(userId, appId, vistas),
    onSuccess: (res) => {
      setScoped(res.permisos)
      showToast(`Permisos sincronizados (${res.total})`, 'success')
      setSyncOpen(false)
      setSyncText('')
      invalidate()
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Error al sincronizar permisos'
      showToast(msg, 'error')
    },
  })

  // Suggestions for autocomplete: union of rol defaults ∪ current scoped,
  // excluding what's already in scoped. Free text is always allowed.
  const suggestions = useMemo(() => {
    const union = new Set([...rolDefaultVistas, ...scoped])
    return Array.from(union).sort()
  }, [rolDefaultVistas, scoped])

  const filteredSuggestions = useMemo(() => {
    const q = newVista.trim().toLowerCase()
    if (!q) return suggestions.filter((s) => !scoped.includes(s)).slice(0, 8)
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !scoped.includes(s)).slice(0, 8)
  }, [newVista, suggestions, scoped])

  function handleAdd() {
    const vista = newVista.trim()
    if (!vista) return
    if (scoped.includes(vista)) {
      showToast(`"${vista}" ya está asignado`, 'info')
      return
    }
    grantMut.mutate(vista)
    setNewVista('')
    inputRef.current?.focus()
  }

  function handleSyncSubmit() {
    const vistas = syncText
      .split(/[\n,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
    syncMut.mutate(vistas)
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Sticky header */}
      <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-100 truncate">
            {appName} — permisos scopados
          </h3>
          <p className="text-xs text-slate-500">
            {scoped.length} override{scoped.length === 1 ? '' : 's'} activo{scoped.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSyncText(scoped.join('\n'))
              setSyncOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <ListChecks size={14} /> Sync (replace-all)
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            disabled={scoped.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Borra todos los overrides; el usuario vuelve a los defaults del rol"
          >
            <RotateCcw size={14} /> Reset a defaults del rol
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-700">
        {/* Left: rol defaults (read-only) */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-teal-400" />
            <h4 className="text-sm font-semibold text-slate-200">Defaults del rol</h4>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">Read-only</span>
          </div>
          {rolDefaultVistas.length === 0 ? (
            <div className="px-3 py-4 rounded-lg bg-slate-900/40 border border-dashed border-slate-700">
              <p className="text-xs text-slate-400">
                Defaults no disponibles en esta UI. Use <span className="text-slate-200 font-medium">Reset</span> para volver al rol base.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {rolDefaultVistas.map((vista) => (
                <span
                  key={vista}
                  className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-teal-900/30 text-teal-200 border border-teal-700/40"
                  title="Permiso heredado del rol"
                >
                  {vista}
                </span>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Estas vistas las concede el rol del usuario. No se pueden editar desde acá; use el módulo Usuarios para cambiar el rol.
          </p>
        </div>

        {/* Right: scoped overrides (editable) */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-amber-400" />
            <h4 className="text-sm font-semibold text-slate-200">Overridden para este usuario</h4>
            <span className="text-[10px] text-amber-400 uppercase tracking-wider">Editable</span>
          </div>
          {scoped.length === 0 ? (
            <div className="px-3 py-4 rounded-lg bg-slate-900/40 border border-dashed border-slate-700">
              <p className="text-xs text-slate-400">
                Sin overrides. El usuario usa solo los defaults del rol.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {scoped.map((vista) => (
                <span
                  key={vista}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-amber-900/30 text-amber-200 border border-amber-700/40"
                >
                  {vista}
                  <button
                    type="button"
                    onClick={() => revokeMut.mutate(vista)}
                    disabled={revokeMut.isPending}
                    className="text-amber-300/70 hover:text-red-400 transition-colors disabled:opacity-50"
                    aria-label={`Revocar ${vista}`}
                    title="Revocar"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add new vista */}
          <div className="pt-3 border-t border-slate-700/60 space-y-2">
            <label className="block text-xs text-slate-400">Agregar permiso</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={newVista}
                  onChange={(e) => setNewVista(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAdd()
                    }
                  }}
                  placeholder="ej: contacto.update"
                  list={`vistas-suggestions-${appId}`}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 text-sm font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <datalist id={`vistas-suggestions-${appId}`}>
                  {filteredSuggestions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newVista.trim() || grantMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus size={14} /> Agregar
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Autocomplete sugiere vistas del catálogo. Texto libre también funciona (ej: vistas custom de la app).
            </p>
          </div>
        </div>
      </div>

      {/* Reset confirm */}
      <ConfirmModal
        open={confirmReset}
        variant="danger"
        title="Resetear permisos scopados"
        message={
          <>
            ¿Borrar todos los <strong className="text-slate-100">{scoped.length}</strong> override(s) para <strong className="text-slate-100">{appName}</strong>?
            <br />
            <span className="text-slate-400 text-xs">
              El usuario volverá a los permisos del rol base. Esta acción no se puede deshacer.
            </span>
          </>
        }
        confirmLabel="Resetear"
        cancelLabel="Cancelar"
        loading={resetMut.isPending}
        onConfirm={() => resetMut.mutate()}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Sync (replace-all) modal */}
      {syncOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !syncMut.isPending && setSyncOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6 pb-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-teal-500/10 flex items-center justify-center">
                <ListChecks size={20} className="text-teal-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-50">Sync (replace-all)</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Pegá la lista completa de vistas (una por línea o separadas por coma).
                  Se reemplazará el set actual.
                </p>
              </div>
              <button
                onClick={() => setSyncOpen(false)}
                disabled={syncMut.isPending}
                className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-6 pb-3">
              <textarea
                value={syncText}
                onChange={(e) => setSyncText(e.target.value)}
                rows={8}
                placeholder="contacto.update&#10;oportunidad.create&#10;seguimiento.delete"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="mt-2 text-[11px] text-slate-500">
                {syncText.split(/[\n,]+/).filter((v) => v.trim()).length} vista(s) detectada(s).
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button
                type="button"
                onClick={() => setSyncOpen(false)}
                disabled={syncMut.isPending}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSyncSubmit}
                disabled={syncMut.isPending}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center gap-2"
              >
                {syncMut.isPending ? (
                  'Sincronizando...'
                ) : (
                  <>
                    <Trash2 size={14} /> Reemplazar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}