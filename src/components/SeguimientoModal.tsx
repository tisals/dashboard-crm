import { useState } from 'react'
import { Phone, Mail, Calendar, MessageSquare, X } from 'lucide-react'
import type { SeguimientoTipo, ContactoAccionPayload } from '../api/types'
import { contactoAcciones } from '../api/crmApi'

interface Props {
  contactoId: number
  contactoNombre: string
  oportunidadId?: number
  entidadId?: number
  onClose: () => void
  onLogged: () => void
}

const TIPO_OPCIONES: { value: SeguimientoTipo; label: string; icon: typeof Phone }[] = [
  { value: 'Llamada', label: 'Llamada', icon: Phone },
  { value: 'Correo', label: 'Correo', icon: Mail },
  { value: 'Reunion', label: 'Reunión', icon: Calendar },
  { value: 'Nota', label: 'Nota', icon: MessageSquare },
]

const HORA_OPCIONES = [
  '08:00','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','13:00','14:00','14:30','15:00','15:30','16:00','16:30','17:00',
]

export function SeguimientoModal({
  contactoId,
  contactoNombre,
  oportunidadId,
  entidadId,
  onClose,
  onLogged,
}: Props) {
  const [tipo, setTipo] = useState<SeguimientoTipo>('Llamada')
  const [notas, setNotas] = useState('')
  const [scheduleNext, setScheduleNext] = useState(false)
  const [fechaProximo, setFechaProximo] = useState('')
  const [horaProximo, setHoraProximo] = useState('09:00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notas.trim()) {
      setError('Las notas son obligatorias.')
      return
    }

    setLoading(true)
    setError(null)

    const payload: ContactoAccionPayload = {
      tipo,
      notas: notas.trim(),
      oportunidad_id: oportunidadId,
      entidad_id: entidadId,
    }

    if (scheduleNext && fechaProximo) {
      payload.fecha = fechaProximo
      payload.hora = horaProximo
    }

    try {
      const res = await contactoAcciones(contactoId, payload)
      if (res.success) {
        onLogged()
        onClose()
      } else {
        setError(res.error ?? 'Error al registrar.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-600 w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-200">Registrar Seguimiento</h2>
            <p className="text-sm text-slate-400">{contactoNombre}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipo de acción</label>
            <div className="grid grid-cols-4 gap-2">
              {TIPO_OPCIONES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipo(value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-colors ${
                    tipo === value
                      ? 'bg-teal-700 border-teal-500 text-teal-300'
                      : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Notas de la interacción <span className="text-red-400">*</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              required
              rows={3}
              placeholder="Resumen de la llamada, puntos clave discutidos..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500 resize-none text-sm"
            />
          </div>

          {/* Programar próximo */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={e => setScheduleNext(e.target.checked)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500"
              />
              <span className="text-sm text-slate-300">Programar próximo seguimiento</span>
            </label>

            {scheduleNext && (
              <div className="mt-3 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={fechaProximo}
                    onChange={e => setFechaProximo(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    required={scheduleNext}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-400 mb-1.5">Hora</label>
                  <select
                    value={horaProximo}
                    onChange={e => setHoraProximo(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
                  >
                    {HORA_OPCIONES.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors"
            >
              {loading ? 'Guardando...' : scheduleNext ? 'Guardar + Programar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
