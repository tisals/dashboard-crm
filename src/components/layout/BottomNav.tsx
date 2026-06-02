import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { MODULES } from '../../config/roles'
import {
  BarChart3,
  Building2,
  Shield,
} from 'lucide-react'

/**
 * BottomNav — Mobile only (md:hidden)
 *
 * 3 group buttons that navigate DIRECTLY to each group's dashboard:
 * - CRM → /dashboard (Dashboard CRM)
 * - ERP → /erp (Dashboard ERP)
 * - Seguridad → /seguridad (Security dashboard)
 *
 * Submenus for each group are rendered in the Sidebar (hamburger menu),
 * NOT here. This keeps the bottom nav clean and fast.
 */

interface GroupButton {
  key: 'crm' | 'erp' | 'seguridad'
  label: string
  icon: React.ComponentType<any>
  path: string
  module: string // for role filtering
}

const GROUP_BUTTONS: GroupButton[] = [
  { key: 'crm', label: 'CRM', icon: BarChart3, path: '/dashboard', module: MODULES.DASHBOARD },
  { key: 'erp', label: 'ERP', icon: Building2, path: '/erp', module: MODULES.ERP_DASHBOARD },
  { key: 'seguridad', label: 'Seguridad', icon: Shield, path: '/seguridad', module: MODULES.SEGURIDAD },
]

export function BottomNav() {
  const { role } = useAuth()

  if (!role) return null

  const allowedModules = new Set(role.modules)

  // Only show buttons for groups the user has access to
  const visibleButtons = GROUP_BUTTONS.filter((g) => allowedModules.has(g.module))

  if (visibleButtons.length === 0) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 md:hidden z-50">
      <div className="flex justify-around items-center px-2 py-1">
        {visibleButtons.map((group) => {
          const Icon = group.icon
          return (
            <NavLink
              key={group.key}
              to={group.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all min-w-[64px] ${
                  isActive
                    ? 'text-teal-400 bg-teal-900/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{group.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
