import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, KeyRound } from 'lucide-react'
import {
  getUsuario,
  getApps,
  getUserAppPermisos,
  getUserIdentity,
} from '../api/crmApi'
import { PermissionsMatrix } from '../components/PermissionsMatrix'
import type { AppCatalog } from '../api/types'

/**
 * Per-user admin page: /settings/usuarios/:userId/permisos
 *
 * Shows the user's identity header + a tabbed matrix view (one tab per
 * active app in the catalog). For each app, the matrix loads the user's
 * scoped permisos and renders them against the rol defaults (currently
 * empty — see `PermissionsMatrix` for rationale).
 *
 * Note on app selection: the dashboard doesn't yet have a backend endpoint
 * that returns "which apps a given user has assigned". We therefore list
 * all active apps in the catalog; an admin viewing this user can manage
 * permisos for any of them. If the user has no scoped permisos for a given
 * app, the matrix still renders an empty "Overridden" column, which makes
 * it clear that the user is on rol defaults only.
 */
export function UsuarioPermisosPage() {
  const navigate = useNavigate()
  const { userId: userIdRaw } = useParams<{ userId: string }>()
  const userId = Number(userIdRaw)

  const [activeAppId, setActiveAppId] = useState<number | null>(null)

  const { data: usuarioRes, isLoading: userLoading } = useQuery({
    queryKey: ['usuarios', userId],
    queryFn: () => getUsuario(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  })

  const { data: appsRes, isLoading: appsLoading } = useQuery({
    queryKey: ['apps', 'permisos-page', { activo: true }],
    queryFn: () => getApps({ activo: true, per_page: 100 }),
    enabled: Number.isFinite(userId) && userId > 0,
  })

  const apps: AppCatalog[] = appsRes?.data?.data ?? []
  const user = usuarioRes?.data

  const { data: scopedRes, isLoading: scopedLoading } = useQuery({
    queryKey: ['users', userId, 'app-permisos', activeAppId],
    queryFn: () => getUserAppPermisos(userId, activeAppId!),
    enabled: Number.isFinite(userId) && userId > 0 && activeAppId !== null,
  })

  // Identity bundle: rol defaults + apps with scoped + effective permisos.
  // Used to populate the "Defaults del rol" column in the matrix (was empty
  // before Sprint 2.5). Backend caches this for 60s.
  const { data: identityRes } = useQuery({
    queryKey: ['usuarios', userId, 'identity'],
    queryFn: () => getUserIdentity(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  })

  const scopedVistas = scopedRes?.permisos ?? []
  const rolDefaultVistas = identityRes?.rol_defaults ?? []
  const appPermisosEfectivos =
    identityRes?.apps.find((a) => a.id === activeAppId)?.permisos_efectivos ?? []

  const activeApp = apps.find((a) => a.id === activeAppId)

  if (!Number.isFinite(userId) || userId <= 0) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-300 text-sm">ID de usuario inválido.</p>
          <button
            onClick={() => navigate('/usuarios')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm transition-colors"
          >
            <ArrowLeft size={14} /> Volver al listado
          </button>
        </div>
      </div>
    )
  }

  const initials = user?.nombre
    ?.split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <button
            onClick={() => navigate('/usuarios')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft size={12} /> Usuarios
          </button>
          <h1 className="text-2xl font-bold text-slate-50">Permisos scopados por app</h1>
          <p className="text-slate-400 mt-0.5">
            Override de permisos del rol para este usuario. Cada tab es una app distinta.
          </p>
        </div>
      </div>

      {/* User identity card */}
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-5 flex items-center gap-4">
        {userLoading ? (
          <div className="flex items-center gap-4 animate-pulse w-full">
            <div className="w-12 h-12 rounded-full bg-slate-700" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-40 bg-slate-700 rounded" />
              <div className="h-2.5 w-60 bg-slate-700 rounded" />
            </div>
          </div>
        ) : !user ? (
          <p className="text-red-400 text-sm">Usuario no encontrado.</p>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-teal-800 text-teal-300 flex items-center justify-center font-semibold text-base shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-slate-100 truncate">{user.nombre}</h2>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-700/50 text-slate-300 border-slate-600/50">
                {user.rol_nombre ?? `Rol #${user.rol_id}`}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                  user.estado === 'Activo'
                    ? 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60'
                    : 'bg-slate-700/50 text-slate-300 border-slate-600/50'
                }`}
              >
                {user.estado}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Loading apps */}
      {appsLoading && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 animate-pulse">
          <div className="h-4 w-32 bg-slate-700 rounded mb-4" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-24 bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      )}

      {/* No apps in catalog */}
      {!appsLoading && apps.length === 0 && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
          <KeyRound size={32} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400">No hay apps activas en el catálogo.</p>
          <p className="text-slate-500 text-xs mt-1">
            Cargá apps en <span className="text-slate-300">Configuración → Apps por Entidad</span>.
          </p>
        </div>
      )}

      {/* Tabs + matrix */}
      {!appsLoading && apps.length > 0 && (
        <div className="space-y-4">
          {/* Tabs strip */}
          <div className="border-b border-slate-700 overflow-x-auto">
            <nav className="flex gap-1 -mb-px" aria-label="Apps">
              {apps.map((app) => {
                const isActive = app.id === activeAppId
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setActiveAppId(app.id)}
                    className={`group inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-teal-500 text-teal-300'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-700/50">
                      {app.slug}
                    </span>
                    <span>{app.nombre}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        app.tipo === 'internal'
                          ? 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                          : app.tipo === 'external'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      }`}
                    >
                      {app.tipo}
                    </span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Active tab content */}
          {activeAppId === null ? (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-12 text-center">
              <p className="text-slate-400 text-sm">Seleccioná una app para ver/editar sus permisos scopados.</p>
            </div>
          ) : scopedLoading ? (
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 animate-pulse space-y-3">
              <div className="h-5 w-48 bg-slate-700 rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="h-24 bg-slate-700 rounded-lg" />
                <div className="h-24 bg-slate-700 rounded-lg" />
              </div>
            </div>
          ) : activeApp ? (
            <PermissionsMatrix
              key={`${userId}-${activeApp.id}`}
              userId={userId}
              appId={activeApp.id}
              appSlug={activeApp.slug}
              appName={activeApp.nombre}
              initialScopedVistas={scopedVistas}
              rolDefaultVistas={rolDefaultVistas}
              effectivePermisos={appPermisosEfectivos}
              onChange={() => {
                // Mutations inside the matrix already invalidate the scoped
                // query — no parent action required here. Reserved for
                // future cross-cutting refreshes (e.g. refreshing "my apps"
                // chip in header).
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}