import { useEffect, useRef } from 'react'
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

interface Props {
  open: boolean
  title: string
  message: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const variantStyles: Record<ConfirmVariant, {
  iconBg: string
  icon: typeof AlertTriangle
  iconColor: string
  button: string
  buttonHover: string
}> = {
  danger: {
    iconBg: 'bg-red-500/10',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    button: 'bg-red-600 hover:bg-red-500',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    button: 'bg-amber-600 hover:bg-amber-500',
    buttonHover: 'hover:bg-amber-700',
  },
  info: {
    iconBg: 'bg-teal-500/10',
    icon: Info,
    iconColor: 'text-teal-400',
    button: 'bg-teal-600 hover:bg-teal-500',
    buttonHover: 'hover:bg-teal-700',
  },
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  const style = variantStyles[variant]
  const Icon = style.icon

  // Focus the confirm button on open
  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus()
    }
  }, [open])

  // Keyboard handlers: Escape cancels, Enter confirms
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && !loading) {
        e.preventDefault()
        onConfirm()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, loading, onConfirm, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-6">
          <div className={`shrink-0 w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center`}>
            <Icon size={20} className={style.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-50">
              {title}
            </h3>
            <div className="mt-2 text-sm text-slate-300">
              {message}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Cerrar"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-medium rounded-lg transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 ${style.button} disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
