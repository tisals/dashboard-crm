import { Phone, Mail, Calendar, MessageSquare, Clock } from 'lucide-react'
import { downloadIcsUrl } from '../api/crmApi'
import type { Seguimiento } from '../api/types'

interface Props {
  seguimientos: Seguimiento[]
}

const ICONS = {
  Llamada: Phone,
  Correo: Mail,
  Reunion: Calendar,
  Nota: MessageSquare,
  Otro: Clock,
} as const

const COLORS = {
  Pendiente: 'border-yellow-500',
  Completado: 'border-emerald-500',
  Cancelado: 'border-red-500',
} as const

export function SeguimientoTimeline({ seguimientos }: Props) {
  if (seguimientos.length === 0) {
    return <p className="text-xs text-slate-500 text-center py-4">Sin seguimientos registrados.</p>
  }

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Seguimientos</h3>
      <div className="relative pl-6 border-l-2 border-slate-600 space-y-4">
        {seguimientos.slice(0, 10).map(seg => {
          const Icon = ICONS[seg.tipo as keyof typeof ICONS] ?? MessageSquare
          const borderColor = COLORS[seg.estado as keyof typeof COLORS] ?? 'border-slate-500'

          return (
            <div key={seg.id} className="relative">
              <div className={`absolute -left-8 top-1 w-4 h-4 rounded-full border-2 ${borderColor} bg-slate-900 flex items-center justify-center`}>
                <Icon size={10} className="text-slate-400" />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-200 capitalize">{seg.tipo}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{seg.notas ?? '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {seg.fecha?.slice(0, 10)} {seg.hora?.slice(0, 5) ?? ''}
                    {seg.autor_nombre ? ` · ${seg.autor_nombre}` : ''}
                  </p>
                </div>
                <a
                  href={downloadIcsUrl(seg.id)}
                  download
                  className="flex-shrink-0 p-1 rounded text-slate-500 hover:text-teal-400"
                  title="Descargar ICS"
                >
                  <Calendar size={11} />
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
