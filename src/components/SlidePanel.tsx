import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string // e.g. 'w-[30%]' used only in overlay mode
  mode?: 'overlay' | 'split' // overlay = floats over content, split = content shrinks
}

export function SlidePanel({ open, onClose, title, children, width = 'w-full md:w-[30%]', mode = 'overlay' }: SlidePanelProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  if (mode === 'split') {
    return (
      <div className={`${width} min-w-[380px] max-w-[640px] shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col overflow-y-auto shadow-2xl`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    )
  }

  // Overlay mode (default)
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      {/* Panel */}
      <div className={`fixed right-0 top-0 h-full ${width} min-w-[320px] max-w-[640px] bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl animate-slide-in`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </>
  )
}
