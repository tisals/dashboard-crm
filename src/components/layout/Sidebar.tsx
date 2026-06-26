import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { MODULES } from '../../config/roles'
import { logout } from '../../api/crmApi'
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Wrench,
  Wallet,
  Users,
  Shield,
  CalendarDays,
  UserCog,
  LogOut,
  Contact,
  MapPin,
  Package,
  BookOpen,
  LayoutGrid,
  Flag,
  GitBranch,
} from 'lucide-react'

const moduleIcons: Record<string, React.ComponentType<any>> = {
  [MODULES.DASHBOARD]: LayoutDashboard,
  [MODULES.ERP_DASHBOARD]: LayoutGrid,
  [MODULES.DIRECTORIO]: Building2,
  [MODULES.CRM]: TrendingUp,
  [MODULES.CONTACTOS]: Contact,
  [MODULES.OPERACIONES]: Wrench,
  [MODULES.FINANZAS]: Wallet,
  [MODULES.TALENTO]: Users,
  [MODULES.SEGURIDAD]: Shield,
  [MODULES.SEGUIMIENTOS]: CalendarDays,
  [MODULES.USUARIOS]: UserCog,
  [MODULES.MAESTROS]: BookOpen,
  [MODULES.CIUDADES]: MapPin,
  [MODULES.PRODUCTOS]: Package,
  [MODULES.MARCAS]: Flag,
  [MODULES.PIPELINES]: GitBranch,
}

const moduleLabels: Record<string, string> = {
  [MODULES.DASHBOARD]: 'Dashboard CRM',
  [MODULES.ERP_DASHBOARD]: 'Dashboard ERP',
  [MODULES.DIRECTORIO]: 'Directorio',
  [MODULES.CRM]: 'Oportunidades',
  [MODULES.CONTACTOS]: 'Contactos',
  [MODULES.OPERACIONES]: 'Operaciones',
  [MODULES.FINANZAS]: 'Finanzas',
  [MODULES.TALENTO]: 'Talento',
  [MODULES.SEGURIDAD]: 'Seguridad',
  [MODULES.SEGUIMIENTOS]: 'Seguimientos',
  [MODULES.USUARIOS]: 'Usuarios',
  [MODULES.MAESTROS]: 'Maestros',
  [MODULES.CIUDADES]: 'Ciudades',
  [MODULES.PRODUCTOS]: 'Productos',
  [MODULES.MARCAS]: 'Marcas / Propia',
  [MODULES.PIPELINES]: 'Pipelines',
}

interface GroupDef {
  label: string
  modules: string[]
}

const GROUPS: GroupDef[] = [
  {
    label: 'CRM',
    modules: [MODULES.DASHBOARD, MODULES.DIRECTORIO, MODULES.CONTACTOS, MODULES.CRM, MODULES.PIPELINES, MODULES.SEGUIMIENTOS],
  },
  {
    label: 'ERP',
    modules: [MODULES.ERP_DASHBOARD, MODULES.TALENTO, MODULES.FINANZAS, MODULES.OPERACIONES],
  },
  {
    label: 'Seguridad',
    modules: [MODULES.SEGURIDAD, MODULES.MARCAS, MODULES.MAESTROS, MODULES.CIUDADES, MODULES.PRODUCTOS, MODULES.USUARIOS],
  },
]

function moduleToPath(module: string): string {
  if (module === MODULES.DASHBOARD) return '/dashboard'
  if (module === MODULES.ERP_DASHBOARD) return '/erp'
  if (module === MODULES.PIPELINES) return '/crm/pipelines'
  if (module === MODULES.CRM) return '/crm/oportunidad'
  if (module === MODULES.SEGUIMIENTOS) return '/seguimientos'
  return `/${module}`
}

interface SidebarProps {
  onMobileNavClick?: () => void
}

export function Sidebar({ onMobileNavClick }: SidebarProps) {
  const { user, logout: authLogout, role } = useAuth()
  const navigate = useNavigate()

  if (!role) return null

  const allowedModules = new Set(role.modules)

  async function handleLogout() {
    try {
      await logout()
    } catch {
      // ignore API errors — still clear local state
    } finally {
      authLogout()
      navigate('/login', { replace: true })
    }
  }

  return (
    <aside className="w-64 h-screen sticky top-0 bg-slate-900 border-r border-slate-700 p-4 flex flex-col shrink-0">
      {/* Logo */}
      {/* Logo */}
      <div className="mb-6">
        <h1 className="text-lg font-bold text-teal-500">CRM Tecnoinnsoft</h1>
        <p className="text-xs text-slate-500 mt-0.5">ERP Comercial</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-5">
        {GROUPS.map((group) => {
          const visibleModules = group.modules.filter(m => allowedModules.has(m))
          if (visibleModules.length === 0) return null

          return (
            <div key={group.label}>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-4 mb-1.5">
                {group.label}
              </p>
              {visibleModules.map((module) => {
                const Icon = moduleIcons[module]
                const label = moduleLabels[module]
                const path = moduleToPath(module)

                if (!Icon) return null

                return (
                  <NavLink
                    key={module}
                    to={path}
                    onClick={onMobileNavClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm ${
                        isActive
                          ? 'bg-teal-800/50 text-teal-400 font-medium'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User info */}
      <div className="border-t border-slate-700 pt-3 mt-3">
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-slate-200 truncate">{user?.nombre}</p>
          <p className="text-xs text-slate-500">{role.name}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
        >
          <LogOut size={18} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
