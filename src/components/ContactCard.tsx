import { Phone, Mail, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Contacto } from '../api/types'
import { SeguimientoModal } from './SeguimientoModal'

interface Props {
  contacto: Contacto
  oportunidadId?: number
  entidadId?: number
  onLogged: () => void
  onEdit?: (contacto: Contacto) => void
  onDelete?: (contacto: Contacto) => void
}

export function ContactCard({ contacto, oportunidadId, entidadId, onLogged, onEdit, onDelete }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const nombreCompleto = `${contacto.nombres} ${contacto.apellidos ?? ''}`.trim()

  function handleEdit() {
    setMenuOpen(false)
    onEdit?.(contacto)
  }

  function handleDelete() {
    setMenuOpen(false)
    onDelete?.(contacto)
  }

  return (
    <>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex flex-col gap-3 hover:border-teal-500/40 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-teal-800 flex items-center justify-center text-teal-400 font-medium text-sm flex-shrink-0">
              {(nombreCompleto || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-200 text-sm truncate">{nombreCompleto}</p>
              {contacto.cargo && (
                <p className="text-xs text-slate-400 truncate">{contacto.cargo}{contacto.area ? ` · ${contacto.area}` : ''}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-slate-700 border border-slate-600 rounded-xl p-1 min-w-40 shadow-xl">
                <button
                  onClick={() => { setMenuOpen(false); setShowModal(true) }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 rounded-lg flex items-center gap-2"
                >
                  <MessageSquare size={14} /> Registrar seguimiento
                </button>
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-600 rounded-lg flex items-center gap-2"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          {contacto.movil && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Phone size={12} className="flex-shrink-0" />
              <span className="truncate">{contacto.movil}</span>
            </div>
          )}
          {contacto.email_contacto && (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <Mail size={12} className="flex-shrink-0" />
              <span className="truncate">{contacto.email_contacto}</span>
            </div>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-700 hover:bg-teal-600 text-teal-300 text-xs font-medium rounded-lg transition-colors"
          >
            <MessageSquare size={13} />
            Seguimiento
          </button>
        </div>
      </div>

      {showModal && (
        <SeguimientoModal
          contactoId={contacto.id}
          contactoNombre={nombreCompleto}
          oportunidadId={oportunidadId}
          entidadId={entidadId ?? (contacto.entidad_id || undefined)}
          onClose={() => setShowModal(false)}
          onLogged={onLogged}
        />
      )}
    </>
  )
}
