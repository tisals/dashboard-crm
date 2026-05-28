import { FileText, Send, CheckCircle, Trophy } from 'lucide-react'
import type { OportunidadEstado } from '../api/types'

interface Props {
  estado: OportunidadEstado
  onDownloadPdf: () => void
  onEnviar: () => void
  onAprobar: () => void
  onGanar: () => void
  loading?: string | null
}

export function ActionButtons({ estado, onDownloadPdf, onEnviar, onAprobar, onGanar, loading }: Props) {
  const isLoading = (action: string) => loading === action

  return (
    <div className="space-y-2">
      <button
        onClick={onDownloadPdf}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-sm font-medium rounded-xl transition-colors"
      >
        <FileText size={16} />
        Descargar PDF
      </button>

      {estado === 'Borrador' && (
        <button
          onClick={onEnviar}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {isLoading('enviar') ? 'Enviando...' : <><Send size={16} /> Enviar Cotización</>}
        </button>
      )}

      {estado === 'Enviada' && (
        <button
          onClick={onAprobar}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {isLoading('aprobar') ? 'Aprobando...' : <><CheckCircle size={16} /> Aprobar Cotización</>}
        </button>
      )}

      {estado === 'Aceptada' && (
        <button
          onClick={onGanar}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {isLoading('ganar') ? 'Procesando...' : <><Trophy size={16} /> Ganar Oportunidad</>}
        </button>
      )}
    </div>
  )
}
