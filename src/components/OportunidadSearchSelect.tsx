import { useState, useEffect, useRef } from 'react'
import { Search, Briefcase, X } from 'lucide-react'
import { getOportunidades, getOportunidad } from '../api/crmApi'
import type { Oportunidad } from '../api/types'

interface OportunidadSearchSelectProps {
  value?: number | null
  /** Por defecto filtra las oportunidades de la entidad actual para no permitir
   *  "perder" la opp cambiando la entidad al guardar. Set a null para no filtrar. */
  filterByEntidadId?: number | null
  /** Si true, lista TODAS las opps (no aplica filtro de entidad) */
  showAll?: boolean
  onChange: (oportunidadId: number | null, oportunidad?: Oportunidad) => void
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  clearable?: boolean
}

export function OportunidadSearchSelect({
  value,
  filterByEntidadId,
  showAll = false,
  onChange,
  placeholder = 'Buscar oportunidad...',
  disabled = false,
  size = 'md',
  label,
  clearable = true,
}: OportunidadSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Oportunidad[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Búsqueda con debounce
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const params: any = {
          search: search.trim(),
          per_page: 15,
          is_latest: true,
        }
        // Si no es showAll y hay entidad, filtramos por entidad
        if (!showAll && filterByEntidadId != null) {
          params.entidad_id = filterByEntidadId
        }
        const res = await getOportunidades(params)
        setResults(res.data?.data ?? [])
      } catch (e) {
        console.error('Error searching oportunidades:', e)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [search, filterByEntidadId, showAll])

  // Cargar el label del value actual
  useEffect(() => {
    if (!value) {
      setSelectedLabel('')
      return
    }
    let cancelled = false
    getOportunidad(value).then(res => {
      if (!cancelled && res?.data) {
        const o = res.data
        setSelectedLabel(`${o.codigo}${o.entidad_nombre ? ` · ${o.entidad_nombre}` : ''}`)
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [value])

  // Cerrar al click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(op: Oportunidad) {
    onChange(op.id, op)
    setSelectedLabel(`${op.codigo}${op.entidad_nombre ? ` · ${op.entidad_nombre}` : ''}`)
    setOpen(false)
    setSearch('')
    setResults([])
  }

  function handleClear() {
    onChange(null)
    setSelectedLabel('')
    setOpen(false)
  }

  const sizeClasses = size === 'sm'
    ? 'px-2 py-1 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-xs font-medium text-slate-400 mb-1">{label}</label>
      )}
      <div className={`flex items-center gap-1 w-full ${sizeClasses} bg-slate-700 border border-slate-600 rounded-lg text-slate-200`}>
        <Briefcase size={size === 'sm' ? 12 : 14} className="text-slate-400 shrink-0 ml-1" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className="flex-1 text-left truncate disabled:opacity-50 disabled:cursor-not-allowed"
          title={selectedLabel || placeholder}
        >
          {selectedLabel || <span className="text-slate-500">{placeholder}</span>}
        </button>
        {clearable && value && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 text-slate-400 hover:text-slate-200 shrink-0"
            title="Limpiar"
          >
            <X size={size === 'sm' ? 12 : 14} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl p-2 w-full shadow-xl min-w-[300px]">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="max-h-60 overflow-y-auto mt-2 space-y-1">
            {loading && (
              <p className="text-slate-500 text-xs px-3 py-2">Buscando...</p>
            )}
            {!loading && results.map(op => (
              <button
                key={op.id}
                type="button"
                onClick={() => handleSelect(op)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-200 text-sm ${
                  op.id === value ? 'bg-slate-700' : ''
                }`}
              >
                <div className="font-medium truncate">
                  {op.codigo}
                  <span className={`ml-2 text-[10px] uppercase px-1.5 py-0.5 rounded ${
                    op.estado === 'Ganada' ? 'bg-emerald-500/20 text-emerald-400' :
                    op.estado === 'Aceptada' ? 'bg-purple-500/20 text-purple-400' :
                    op.estado === 'Enviada' ? 'bg-blue-500/20 text-blue-400' :
                    op.estado === 'Perdida' || op.estado === 'Rechazada' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-600 text-slate-300'
                  }`}>{op.estado}</span>
                </div>
                {op.entidad_nombre && (
                  <div className="text-slate-400 text-xs truncate">
                    {op.entidad_nombre}
                  </div>
                )}
              </button>
            ))}
            {!loading && search && results.length === 0 && (
              <p className="text-slate-500 text-xs px-3 py-2">Sin resultados</p>
            )}
            {!loading && !search && (
              <p className="text-slate-500 text-xs px-3 py-2">
                Escribí código o nombre de cliente
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
