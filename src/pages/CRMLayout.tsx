import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { LayoutList, GitBranch, LayoutDashboard, TrendingUp, Kanban, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPipelines } from '../api/crmApi'

export type CRMLayoutContext = {
  selectedPipelineId: string
  setSelectedPipelineId: (id: string) => void
  pipelines: any[]
  view: 'kanban' | 'list'
  setView: (v: 'kanban' | 'list') => void
  /** Increments each time "Nueva Oportunidad" is clicked — CRMPage watches this via useEffect */
  createSignal: number
}

export function CRMLayout() {
  const location = useLocation()
  const isOportunidades = location.pathname === '/crm/oportunidad'

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [createSignal, setCreateSignal] = useState(0)

  const { data: pipelinesRes } = useQuery({
    queryKey: ['pipelines'],
    queryFn: getPipelines,
  })
  const pipelinesRaw = pipelinesRes?.data ?? []
  const pipelines = Array.isArray(pipelinesRaw) ? pipelinesRaw : Object.values(pipelinesRaw)

  // Auto-select first pipeline on initial load
  if (!selectedPipelineId && pipelines.length > 0) {
    setSelectedPipelineId(String(pipelines[0].id))
  }

  const contextValue: CRMLayoutContext = {
    selectedPipelineId,
    setSelectedPipelineId,
    pipelines,
    view,
    setView,
    createSignal,
  }

  return (
    <div className="space-y-4">
      {/* Sub-navegación CRM con controles integrados */}
      <nav className="flex items-center gap-1 bg-slate-800 rounded-xl p-1 border border-slate-700 overflow-x-auto flex-wrap">
        {/* Dashboard tab */}
        <NavLink
          to="/crm/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-teal-700 text-teal-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`
          }
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        {/* Oportunidades tab + pipeline selector */}
        <NavLink
          to="/crm/oportunidad"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-teal-700 text-teal-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`
          }
        >
          <TrendingUp size={16} />
          <span>Oportunidades</span>
        </NavLink>

        {/* Pipeline selector — only visible on Oportunidades page */}
        {isOportunidades && (
          <select
            value={selectedPipelineId}
            onChange={e => setSelectedPipelineId(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="ml-1 px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {pipelines.map((p: any) => (
              <option key={p.id} value={String(p.id)}>{p.nombre}</option>
            ))}
          </select>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* View toggle + New button — only on Oportunidades page */}
        {isOportunidades && (
          <>
            <div className="flex bg-slate-900 rounded-lg p-0.5 mr-1">
              <button
                onClick={() => setView('kanban')}
                className={`p-1.5 rounded-md transition-colors ${view === 'kanban' ? 'bg-teal-700 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
                title="Kanban"
              >
                <Kanban size={14} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-teal-700 text-teal-300' : 'text-slate-400 hover:text-slate-200'}`}
                title="Lista"
              >
                <LayoutList size={14} />
              </button>
            </div>
            <button
              onClick={() => setCreateSignal(c => c + 1)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Nueva Oportunidad
            </button>
          </>
        )}

        {/* Pipelines tab */}
        <NavLink
          to="/crm/pipelines"
          className={({ isActive }) =>
            `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              isActive
                ? 'bg-teal-700 text-teal-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`
          }
        >
          <GitBranch size={16} />
          <span>Pipelines</span>
        </NavLink>
      </nav>

      {/* Contenido anidado con contexto */}
      <Outlet context={contextValue} />
    </div>
  )
}
