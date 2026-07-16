import { useState, useEffect, useRef } from 'react'
import { Search, Building2, X } from 'lucide-react'
import { getEntidades, getEntidad } from '../api/crmApi'
import type { Entidad } from '../api/types'

interface EntidadSearchSelectProps {
  value?: number | null
  onChange: (entidadId: number | null, entidad?: Entidad) => void
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  /** Etiqueta visible sobre el selector (ej: "Cambiar entidad") */
  label?: string
  /** Si true, muestra el botón "X" para limpiar */
  clearable?: boolean
}

export function EntidadSearchSelect({
  value,
  onChange,
  placeholder = 'Buscar entidad...',
  disabled = false,
  size = 'md',
  label,
  clearable = true,
}: EntidadSearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Entidad[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedName, setSelectedName] = useState<string>('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Buscar con debounce
  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await getEntidades({ search: search.trim(), per_page: 10 })
        setResults(res.data?.data ?? [])
      } catch (e) {
        console.error('Error searching entidades:', e)
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  // Si hay value, cargar el nombre una vez
  useEffect(() => {
    if (!value) {
      setSelectedName('')
      return
    }
    let cancelled = false
    getEntidad(value).then(res => {
      if (!cancelled && res?.data) setSelectedName(res.data.nombre ?? '')
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

  function handleSelect(ent: Entidad) {
    onChange(ent.id, ent)
    setSelectedName(ent.nombre)
    setOpen(false)
    setSearch('')
    setResults([])
  }

  function handleClear() {
    onChange(null)
    setSelectedName('')
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
        <Building2 size={size === 'sm' ? 12 : 14} className="text-slate-400 shrink-0 ml-1" />
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className="flex-1 text-left truncate disabled:opacity-50 disabled:cursor-not-allowed"
          title={selectedName || placeholder}
        >
          {selectedName || <span className="text-slate-500">{placeholder}</span>}
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
        <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-xl p-2 w-full shadow-xl min-w-[280px]">
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
            {!loading && results.map(ent => (
              <button
                key={ent.id}
                type="button"
                onClick={() => handleSelect(ent)}
                className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-700 text-slate-200 text-sm ${
                  ent.id === value ? 'bg-slate-700' : ''
                }`}
              >
                <div className="font-medium truncate">{ent.nombre}</div>
                {(ent.identificacion || ent.dominio) && (
                  <div className="text-slate-400 text-xs truncate">
                    {[ent.identificacion, ent.dominio].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
            {!loading && search && results.length === 0 && (
              <p className="text-slate-500 text-xs px-3 py-2">Sin resultados</p>
            )}
            {!loading && !search && (
              <p className="text-slate-500 text-xs px-3 py-2">Escribí para buscar</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
