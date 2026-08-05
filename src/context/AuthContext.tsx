import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { RoleSlug, ROLES, hasPermission, canAccessModule } from '../config/roles'
import { getMyApps } from '../api/crmApi'
import type { MyApp } from '../api/types'

interface AuthUser {
  id: number
  email: string
  nombre: string
  rol_slug: RoleSlug
  token?: string
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Apps the user has access to (transitively derived). */
  apps: MyApp[]
  /** True while apps are being fetched. */
  appsLoading: boolean
  /** Manually re-fetch apps (e.g. after admin changes). */
  refreshApps: () => Promise<void>
  login: (userData: { id: number; email: string; nombre: string; rol_id: number; token?: string }) => Promise<void>
  logout: () => void
  hasPermission: (module: string, action: 'create' | 'read' | 'update' | 'delete') => boolean
  canAccessModule: (module: string) => boolean
  role: typeof ROLES[keyof typeof ROLES] | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('auth_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthUser
        // Backfill rol_slug for users logged in before this fix
        if (!parsed.rol_slug && 'rol_id' in parsed) {
          const entry = Object.values(ROLES).find(r => r.id === (parsed as any).rol_id)
          parsed.rol_slug = (entry?.slug ?? 'super_admin') as RoleSlug
          localStorage.setItem('auth_user', JSON.stringify(parsed))
        }
        return parsed
      } catch { /* ignore */ }
    }
    return null
  })

  const [apps, setApps] = useState<MyApp[]>([])
  const [appsLoading, setAppsLoading] = useState(false)

  const isAuthenticated = !!user
  const role = user ? ROLES[user.rol_slug] : null

  // Map backend rol_id to frontend rol_slug
  function rolIdToSlug(rolId: number): RoleSlug {
    const entry = Object.values(ROLES).find(r => r.id === rolId)
    return (entry?.slug ?? 'super_admin') as RoleSlug
  }

  const fetchApps = useCallback(async () => {
    if (!user) return
    setAppsLoading(true)
    try {
      const res = await getMyApps()
      setApps(res.data?.apps ?? [])
    } catch {
      // Silent — the widget can show empty state. Auth failure will be caught elsewhere.
      setApps([])
    } finally {
      setAppsLoading(false)
    }
  }, [user])

  // Fetch apps whenever the user logs in (or on mount if already logged in)
  useEffect(() => {
    if (user) {
      fetchApps()
    } else {
      setApps([])
    }
  }, [user, fetchApps])

  async function login(userData: { id: number; email: string; nombre: string; rol_id: number; token?: string }) {
    const rol_slug = rolIdToSlug(userData.rol_id)
    const userWithSlug = { ...userData, rol_slug } as AuthUser
    setUser(userWithSlug)
    localStorage.setItem('auth_user', JSON.stringify(userWithSlug))
  }

  function logout() {
    setUser(null)
    setApps([])
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  }

  const checkPermission = (module: string, action: 'create' | 'read' | 'update' | 'delete') => {
    if (!user) return false
    return hasPermission(user.rol_slug, module, action)
  }

  const checkModuleAccess = (module: string) => {
    if (!user) return false
    return canAccessModule(user.rol_slug, module)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      apps,
      appsLoading,
      refreshApps: fetchApps,
      login,
      logout,
      hasPermission: checkPermission,
      canAccessModule: checkModuleAccess,
      role,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}