import { useState, useEffect } from 'react'
import { createContacto, updateContacto, reasignarContacto } from '../api/crmApi'
import type { Contacto, ContactoCreate, Entidad } from '../api/types'
import { SlidePanel } from './SlidePanel'

interface ContactoFormModalProps {
  entidadId?: number
  contacto?: Contacto
  entidades?: Entidad[]
  onSuccess: () => void
  onClose: () => void
  mode?: 'overlay' | 'split'
}

type FormErrors = Partial<Record<keyof ContactoCreate | 'estado' | '_global', string>>

const ESTADOS = ['Activo', 'Inactivo']

export function ContactoFormModal({ entidadId, contacto, entidades = [], onSuccess, onClose, mode = 'overlay' }: ContactoFormModalProps) {
  const isEdit = !!contacto
  const [form, setForm] = useState({
    nombres: '',
    apellidos: '',
    area: '',
    cargo: '',
    tel_contacto: '',
    movil: '',
    email_contacto: '',
    email_secundario: '',
    rol: '',
    etapa: '',
    estado: 'Activo',
    entidad_id: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  // Conflict state
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  const [conflictData, setConflictData] = useState<{ id: number; nombres: string; apellidos: string; email_contacto: string } | null>(null)
  const [pendingReasignar, setPendingReasignar] = useState<{ entidadId: number } | null>(null)

  useEffect(() => {
    if (contacto) {
      setForm({
        nombres: contacto.nombres,
        apellidos: contacto.apellidos,
        area: contacto.area ?? '',
        cargo: contacto.cargo ?? '',
        tel_contacto: contacto.tel_contacto ?? '',
        movil: contacto.movil ?? '',
        email_contacto: contacto.email_contacto ?? '',
        email_secundario: contacto.email_secundario ?? '',
        rol: contacto.rol ?? '',
        etapa: contacto.etapa ?? '',
        estado: contacto.estado,
        entidad_id: contacto.entidad_id?.toString() ?? entidadId?.toString() ?? '',
      })
    } else {
      setForm(prev => ({ ...prev, entidad_id: entidadId?.toString() ?? '' }))
    }
  }, [contacto, entidadId])

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.nombres.trim()) errs.nombres = 'El nombre es obligatorio'
    if (!form.apellidos.trim()) errs.apellidos = 'Los apellidos son obligatorios'
    if (form.email_contacto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contacto)) {
      errs.email_contacto = 'Email inválido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function doReasignar(nuevaEntidadId: number, merge: boolean) {
    if (!contacto) return
    setLoading(true)
    try {
      await reasignarContacto(contacto.id, { entidad_id: nuevaEntidadId, merge })
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; message?: string } } }
      setErrors({ _global: axiosErr?.response?.data?.message ?? 'Error al reasignar' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setErrors({})

    try {
      const targetEntidadId = form.entidad_id ? Number(form.entidad_id) : null
      const originalEntidadId = contacto?.entidad_id ?? entidadId ?? null
      const entityChanged = isEdit && targetEntidadId && targetEntidadId !== originalEntidadId

      if (entityChanged) {
        // Usar endpoint de reasignación
        try {
          await reasignarContacto(contacto!.id, { entidad_id: targetEntidadId })
          // Also update other fields
          const { entidad_id: _, ...rest } = form
          await updateContacto(contacto!.id, {
            ...rest,
            nombres: form.nombres.trim(),
            apellidos: form.apellidos.trim(),
          })
          onSuccess()
          onClose()
          return
        } catch (err: unknown) {
          const axiosErr = err as { response?: { data?: { error?: string; conflicting_contacto?: any; message?: string } } }
          if (axiosErr?.response?.data?.error === 'conflict') {
            // Mostrar dialog de conflicto
            setConflictData(axiosErr.response.data.conflicting_contacto)
            setPendingReasignar({ entidadId: targetEntidadId })
            setShowConflictDialog(true)
            setLoading(false)
            return
          }
          throw err
        }
      }

      // Normal create/update
      const payload: ContactoCreate = {
        entidad_id: targetEntidadId ?? originalEntidadId ?? undefined,
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        area: form.area || undefined,
        cargo: form.cargo || undefined,
        tel_contacto: form.tel_contacto || undefined,
        movil: form.movil || undefined,
        email_contacto: form.email_contacto || undefined,
        email_secundario: form.email_secundario || undefined,
        rol: form.rol || undefined,
        etapa: form.etapa || undefined,
      }
      if (isEdit) {
        await updateContacto(contacto!.id, payload)
      } else {
        await createContacto(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; error?: string } } }
      const serverErrors = axiosErr?.response?.data?.errors
      if (serverErrors) {
        const mapped: FormErrors = {}
        for (const [key, msgs] of Object.entries(serverErrors)) {
          const field = key as keyof FormErrors
          mapped[field] = msgs[0]
        }
        setErrors(mapped)
      } else {
        setErrors({ _global: axiosErr?.response?.data?.error ?? 'Error al guardar' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <SlidePanel open onClose={onClose} title={isEdit ? 'Editar Contacto' : 'Nuevo Contacto'} mode={mode}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors._global && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {errors._global}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Nombres *</label>
              <input type="text" value={form.nombres} onChange={e => setForm({ ...form, nombres: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
              {errors.nombres && <p className="text-red-400 text-xs mt-1">{errors.nombres}</p>}
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Apellidos *</label>
              <input type="text" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
              {errors.apellidos && <p className="text-red-400 text-xs mt-1">{errors.apellidos}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Área</label>
              <input type="text" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Cargo</label>
              <input type="text" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
              <input type="text" value={form.tel_contacto} onChange={e => setForm({ ...form, tel_contacto: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Móvil</label>
              <input type="text" value={form.movil} onChange={e => setForm({ ...form, movil: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email_contacto} onChange={e => setForm({ ...form, email_contacto: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            {errors.email_contacto && <p className="text-red-400 text-xs mt-1">{errors.email_contacto}</p>}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email secundario</label>
            <input type="email" value={form.email_secundario} onChange={e => setForm({ ...form, email_secundario: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Rol</label>
              <input type="text" value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Etapa</label>
              <input type="text" value={form.etapa} onChange={e => setForm({ ...form, etapa: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            </div>
          </div>

          {/* Entidad (reasignación) */}
          {entidades.length > 0 && (
            <div>
              <label className="block text-sm text-slate-400 mb-1">Entidad</label>
              <select value={form.entidad_id} onChange={e => setForm({ ...form, entidad_id: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
                <option value="">Sin entidad</option>
                {entidades.map(ent => (
                  <option key={ent.id} value={ent.id.toString()}>{ent.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-400 mb-1">Estado</label>
            <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-slate-200 rounded-xl transition-colors">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors">
              {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear contacto')}
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* Conflict Dialog */}
      {showConflictDialog && conflictData && pendingReasignar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60" onClick={() => { setShowConflictDialog(false); setConflictData(null); setPendingReasignar(null) }}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-200 mb-2">Conflicto de contacto</h3>
            <p className="text-sm text-slate-400 mb-4">
              Ya existe un contacto con el email <span className="text-slate-200 font-medium">{conflictData.email_contacto}</span> en la entidad destino:
            </p>
            <div className="bg-slate-900 rounded-lg p-3 mb-4 border border-slate-700">
              <p className="text-sm text-slate-200 font-medium">{conflictData.nombres} {conflictData.apellidos}</p>
              <p className="text-xs text-slate-400">{conflictData.email_contacto}</p>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              ¿Deseás <span className="text-teal-400 font-medium">fusionar</span> los contactos? Los seguimientos y oportunidades del contacto existente se transferirán al actual.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setShowConflictDialog(false); setConflictData(null); setPendingReasignar(null) }}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={async () => {
                setShowConflictDialog(false)
                await doReasignar(pendingReasignar.entidadId, true)
              }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white rounded-xl text-sm font-medium transition-colors">
                {loading ? 'Fusionando...' : 'Sí, fusionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
