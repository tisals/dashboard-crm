import { ReactNode } from 'react'
import { MoreVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export interface InfoItem {
  icon?: ReactNode
  text: string | ReactNode
}

export interface TagItem {
  label: string
  variant?: 'teal' | 'slate' | 'blue' | 'amber' | 'emerald' | 'red' | 'purple'
}

export interface MenuItem {
  icon?: ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}

interface CommonCardProps {
  title: string
  subtitle?: string
  avatarText?: string
  avatarColor?: string // bg class e.g. bg-teal-800 text-teal-400
  info1?: InfoItem
  info2?: InfoItem
  tags?: (TagItem | ReactNode)[]
  actions?: ReactNode[] // Principal buttons/actions at the bottom
  menuItems?: MenuItem[] // Dropdown actions
  actionSlot?: ReactNode // Slot for inline action buttons (e.g. "+ Seguimiento" hover button)
  onClick?: () => void
}

export function CommonCard({
  title,
  subtitle,
  avatarText,
  avatarColor = 'bg-teal-800 text-teal-400',
  info1,
  info2,
  tags = [],
  actions = [],
  menuItems = [],
  actionSlot,
  onClick,
}: CommonCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const renderTag = (tag: TagItem | ReactNode, index: number) => {
    if (tag && typeof tag === 'object' && 'label' in tag) {
      const t = tag as TagItem
      const base = 'px-2 py-0.5 rounded-full text-[10px] font-medium border'
      const variants = {
        teal: 'bg-teal-900/40 text-teal-300 border-teal-800/60',
        slate: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
        blue: 'bg-blue-900/40 text-blue-300 border-blue-800/60',
        amber: 'bg-amber-900/40 text-amber-300 border-amber-800/60',
        emerald: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/60',
        red: 'bg-red-900/40 text-red-300 border-red-800/60',
        purple: 'bg-purple-900/40 text-purple-300 border-purple-800/60',
      }
      const variantClass = variants[t.variant ?? 'slate']
      return (
        <span key={index} className={`${base} ${variantClass}`}>
          {t.label}
        </span>
      )
    }
    return <div key={index}>{tag}</div>
  }

  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-3 hover:border-teal-500/40 transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {avatarText && (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${avatarColor}`}>
              {avatarText.toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-200 text-sm truncate" title={title}>{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 truncate" title={subtitle}>{subtitle}</p>
            )}
          </div>
        </div>

        {/* Dropdown Menu + optional actionSlot (inline action button next to menu) */}
        <div className="flex items-center gap-1">
        {actionSlot}
        {menuItems.length > 0 && (
          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-40 bg-slate-700 border border-slate-600 rounded-xl p-1 min-w-40 shadow-xl">
                {menuItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuOpen(false)
                      item.onClick()
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
                      item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : 'text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Info Items */}
      {(info1 || info2) && (
        <div className="space-y-1.5">
          {info1 && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              {info1.icon}
              <span className="truncate">{info1.text}</span>
            </div>
          )}
          {info2 && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              {info2.icon}
              <span className="truncate">{info2.text}</span>
            </div>
          )}
        </div>
      )}

      {/* Separator & Tags */}
      {tags.length > 0 && (
        <>
          <hr className="border-slate-700/60 my-0.5" />
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, idx) => renderTag(tag, idx))}
          </div>
        </>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <>
          <hr className="border-slate-700/60 my-0.5" />
          <div className="flex gap-2 w-full mt-auto">
            {actions}
          </div>
        </>
      )}
    </div>
  )
}
