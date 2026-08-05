import { useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

let listeners: Array<(toast: ToastItem) => void> = []
let nextId = 1

export function showToast(message: string, variant: ToastVariant = 'success') {
  const toast: ToastItem = { id: nextId++, message, variant }
  listeners.forEach((l) => l(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  useEffect(() => {
    function add(toast: ToastItem) {
      setToasts((prev) => [...prev, toast])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id))
      }, 4000)
    }
    listeners.push(add)
    return () => {
      listeners = listeners.filter((l) => l !== add)
    }
  }, [])

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const variantStyles: Record<ToastVariant, { bg: string; icon: typeof CheckCircle2; iconColor: string }> = {
    success: { bg: 'bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2, iconColor: 'text-emerald-400' },
    error: { bg: 'bg-red-500/10 border-red-500/30', icon: AlertCircle, iconColor: 'text-red-400' },
    info: { bg: 'bg-teal-500/10 border-teal-500/30', icon: Info, iconColor: 'text-teal-400' },
  }

  return (
    <div className="fixed bottom-4 right-4 z-[120] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => {
        const style = variantStyles[t.variant]
        const Icon = style.icon
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl ${style.bg} min-w-[280px] max-w-md animate-in slide-in-from-right`}
            role="status"
          >
            <Icon size={18} className={style.iconColor} shrink-0 />
            <p className="flex-1 text-sm text-slate-100">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
