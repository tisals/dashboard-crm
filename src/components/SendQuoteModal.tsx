import { useState } from 'react'
import { Send, X } from 'lucide-react'
import { enviarCotizacion } from '../api/crmApi'
import type { Contacto } from '../api/types'
import { SlidePanel } from './SlidePanel'

interface SendQuoteModalProps {
  oportunidadId: number
  oportunidad: { codigo: string; entidad_id: number }
  contactos: Contacto[]
  onClose: () => void
  onSent: () => void
}

const DEFAULT_MESSAGE = `Estimado cliente,

Adjunto encontrará nuestra cotización formal. Quedamos atentos a cualquier consulta.

Saludos cordiales.`

export function SendQuoteModal({ oportunidadId, oportunidad, contactos, onClose, onSent }: SendQuoteModalProps) {
  const [mensaje, setMensaje] = useState(DEFAULT_MESSAGE)
  const [contactoId, setContactoId] = useState<number | null>(
    contactos.find(c => c.rol === 'Decisor')?.id ?? contactos[0]?.id ?? null,
  )
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    setSending(true)
    setError(null)
    try {
      await enviarCotizacion(oportunidadId, {
        mensaje: mensaje.trim() || undefined,
        contacto_id: contactoId ?? undefined,
      })
      onSent()
    } catch (err: unknown) {
      if (err instanceof Error && 'response' in err) {
        const axiosErr = err as { response?: { data?: { error?: string } } }
        setError(axiosErr.response?.data?.error ?? 'Error de validación')
      } else {
        setError('Error de conexión')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <SlidePanel open onClose={onClose} title={`Enviar Cotización — ${oportunidad.codigo}`}>
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Contact Selection */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Enviar a</label>
          <select
            value={contactoId ?? ''}
            onChange={e => setContactoId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500"
          >
            <option value="">Sin contacto específico</option>
            {contactos.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombres} {c.apellidos}{c.cargo ? ` — ${c.cargo}` : ''}{c.rol === 'Decisor' ? ' ⭐' : ''}
                {c.email_contacto ? ` <${c.email_contacto}>` : ''}
              </option>
            ))}
          </select>
          {contactos.length === 0 && (
            <p className="text-xs text-amber-400 mt-1">No hay contactos para esta entidad.</p>
          )}
        </div>

        {/* Email Body */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Mensaje</label>
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            rows={8}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-teal-500 resize-none font-mono"
            placeholder="Escribí tu mensaje aquí..."
          />
          <p className="text-[10px] text-slate-500 mt-1">
            Este texto se incluirá en el email y se guardará como nota del seguimiento.
          </p>
        </div>

        {/* Preview */}
        <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
          <p className="text-xs text-slate-400 mb-1">Adjunto:</p>
          <p className="text-sm text-slate-200">📄 cotizacion-{oportunidad.codigo}.pdf</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <X size={16} /> Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Send size={16} /> {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </SlidePanel>
  )
}
