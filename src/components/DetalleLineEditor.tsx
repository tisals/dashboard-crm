import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X, Search as SearchIcon } from 'lucide-react'
import { getProductos } from '../api/crmApi'
import type { Producto } from '../api/types'

export interface LineaForm {
  id?: number
  producto_id: number | null
  concepto: string       // Product name (auto-filled)
  descripcion: string    // Custom description (editable)
  cantidad: number
  vr_unitario: number | ''
  iva: number | ''       // Read-only, inherited from product
}

interface Props {
  lines: LineaForm[]
  onChange: (lines: LineaForm[]) => void
}

function LineRow({
  line,
  index,
  total,
  onUpdate,
  onRemove,
}: {
  line: LineaForm
  index: number
  total: number
  onUpdate: (field: keyof LineaForm, value: string | number | null) => void
  onRemove: () => void
}) {
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (line.producto_id && line.concepto) {
      setSearch(line.concepto)
    }
  }, [line.producto_id, line.concepto])

  const { data: prodData } = useQuery({
    queryKey: ['productos', 'line', index, search],
    queryFn: () => getProductos({ search: search || undefined }),
    enabled: search.length >= 1,
    staleTime: 30000,
  })
  const productos: Producto[] = prodData?.data?.data ?? []

  useEffect(() => {
    if (!showDropdown) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handleClick) }
  }, [showDropdown])

  function handleSelectProducto(prod: Producto) {
    setSearch(prod.nombre)
    setShowDropdown(false)
    onUpdate('producto_id', prod.id)
    onUpdate('concepto', prod.nombre)
    onUpdate('descripcion', prod.descripcion || prod.nombre)
    onUpdate('vr_unitario', prod.precio ?? 0)
    onUpdate('iva', prod.iva ?? 0)
  }

  function handleSearchChange(val: string) {
    setSearch(val)
    setShowDropdown(val.length >= 1 && !line.producto_id)
    if (line.producto_id) {
      onUpdate('producto_id', null)
      onUpdate('concepto', val)
    }
  }

  const vrNum = line.vr_unitario === '' ? 0 : line.vr_unitario
  const ivaNum = line.iva === '' ? 0 : line.iva
  const totalLinea = line.cantidad * vrNum * (1 + ivaNum / 100)

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-600 p-3 space-y-2" ref={dropdownRef}>
      {/* Product search + remove */}
      <div className="flex items-start gap-2">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            onFocus={() => { if (search.length >= 1 && !line.producto_id) setShowDropdown(true) }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          />
          {showDropdown && productos.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg max-h-40 overflow-y-auto shadow-xl">
              {productos.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProducto(p)}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-700 border-b border-slate-700 last:border-b-0"
                >
                  <span className="truncate font-medium">{p.nombre}</span>
                  {p.precio != null && <span className="text-teal-400 ml-2 shrink-0">${p.precio.toLocaleString()}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          title={total > 1 ? 'Eliminar línea' : undefined}
        >
          <X size={14} />
        </button>
      </div>

      {/* Description (editable) */}
      <div>
        <label className="block text-[10px] text-slate-500 mb-0.5">Descripción</label>
        <textarea
          value={line.descripcion}
          onChange={e => onUpdate('descripcion', e.target.value)}
          placeholder="Descripción detallada del ítem..."
          rows={2}
          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500 resize-none"
        />
      </div>

      {/* Fields: cantidad, vr_unitario, iva */}
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Cantidad</label>
          <input
            type="number"
            value={line.cantidad}
            onChange={e => onUpdate('cantidad', Number(e.target.value) || 0)}
            min={0} step={0.01}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Vr Unitario</label>
          <input
            type="number"
            value={line.vr_unitario === '' ? '' : line.vr_unitario}
            onChange={e => onUpdate('vr_unitario', e.target.value === '' ? '' : Number(e.target.value))}
            min={0}
            className="w-full px-2 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">IVA %</label>
          <input
            type="number"
            value={line.iva === '' ? '' : line.iva}
            readOnly
            className="w-full px-2 py-1.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-slate-400 text-xs cursor-not-allowed"
            title="IVA heredado del producto"
          />
        </div>
      </div>

      {/* Total */}
      <div className="text-right text-xs text-teal-400 font-medium pt-1 border-t border-slate-700/50">
        Total: ${totalLinea.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
    </div>
  )
}

export function DetalleLineEditor({ lines, onChange }: Props) {
  function addLine() {
    onChange([...lines, { producto_id: null, concepto: '', descripcion: '', cantidad: 1, vr_unitario: '', iva: '' }])
  }

  function removeLine(i: number) {
    if (lines.length <= 1) return
    onChange(lines.filter((_, idx) => idx !== i))
  }

  function updateLine(i: number, field: keyof LineaForm, value: string | number | null) {
    const updated = lines.map((line, idx) => {
      if (idx !== i) return line
      return { ...line, [field]: value }
    })
    onChange(updated)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">Líneas de Cotización</h3>
        <button
          onClick={addLine}
          className="flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus size={14} /> Agregar línea
        </button>
      </div>

      {lines.length === 0 && (
        <p className="text-xs text-slate-500 text-center py-6">Sin líneas. Agregá productos a la cotización.</p>
      )}

      {lines.map((line, i) => (
        <LineRow
          key={line.id ?? `new-${i}`}
          line={line}
          index={i}
          total={lines.length}
          onUpdate={(field, value) => updateLine(i, field, value)}
          onRemove={() => removeLine(i)}
        />
      ))}
    </div>
  )
}
