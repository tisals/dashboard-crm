import { useState } from 'react'
import type { Oportunidad } from '../api/types'

interface Props {
  oportunidad: Oportunidad
  onSave: (data: Partial<Oportunidad>) => Promise<void>
}

const CAMPOS = [
  { key: 'observaciones', label: 'Observaciones', type: 'textarea' },
  { key: 'aclaraciones', label: 'Notas aclaratorias', type: 'textarea' },
  { key: 'validez_oferta', label: 'Validez de oferta (días)', type: 'number' },
  { key: 'tiempo_entrega', label: 'Tiempo de entrega', type: 'text' },
  { key: 'forma_pago', label: 'Forma de pago', type: 'text' },
  { key: 'garantia', label: 'Garantía', type: 'text' },
  { key: 'fuente_canal', label: 'Fuente / Canal', type: 'text' },
]

export function CotizacionEditor({ oportunidad, onSave }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const c of CAMPOS) {
      init[c.key] = String((oportunidad as any)[c.key] ?? '')
    }
    return init
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300">Detalles de Cotización</h3>
      {CAMPOS.map(({ key, label, type }) => (
        <div key={key}>
          <label className="block text-xs text-slate-400 mb-1">{label}</label>
          {type === 'textarea' ? (
            <textarea
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500 resize-none"
            />
          ) : (
            <input
              type={type}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-teal-500"
            />
          )}
        </div>
      ))}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-teal-700 hover:bg-teal-600 disabled:bg-teal-800 text-teal-200 text-sm font-medium rounded-lg transition-colors"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  )
}
