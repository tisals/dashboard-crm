import { useState, useEffect } from 'react'
import { createContacto, updateContacto } from '../api/crmApi'
import type { Contacto, ContactoCreate } from '../api/types'
import { SlidePanel } from './SlidePanel'

interface ContactoFormModalProps {
  entidadId?: number
  contacto?: Contacto
  onSuccess: () => void
  onClose: () => void
  mode?: 'overlay' | 'split'
}

type FormErrors = Partial<Record<keyof ContactoCreate | 'estado', string>>

const ESTADOS = ['Activo', 'Inactivo']

export function ContactoFormModal({ entidadId, contacto, onSuccess, onClose, mode = 'overlay' }: ContactoFormModalProps) {
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
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

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
      })
    }
  }, [contacto])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: ContactoCreate = {
        entidad_id: entidadId ?? contacto!.entidad_id,
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
        setErrors({ nombres: axiosErr?.response?.data?.error ?? 'Error al guardar' })
      }
    } finally {
      setLoading(false)
    }
  }

  function Field({ name, label, type = 'text', required }: { name: keyof typeof form; label: string; type?: string; required?: boolean }) {
    return (
      <div>
        <label className="block text-sm text-slate-400 mb-1">{label}{required && ' *'}</label>
        {type === 'select' ? (
          <select
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={form[name]}
            onChange={(e) => setForm({ ...form, [name]: e.target.value })}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
          />
        )}
        {errors[name] && <p className="text-red-400 text-xs mt-1">{errors[name]}</p>}
      </div>
    )
  }

  return (
    <SlidePanel open onClose={onClose} title={isEdit ? 'Editar Contacto' : 'Nuevo Contacto'} mode={mode}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field name="nombres" label="Nombres" required />
          <Field name="apellidos" label="Apellidos" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field name="area" label="Área" />
          <Field name="cargo" label="Cargo" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field name="tel_contacto" label="Teléfono" />
          <Field name="movil" label="Móvil" />
        </div>
        <Field name="email_contacto" label="Email" type="email" />
        <Field name="email_secundario" label="Email secundario" type="email" />
        <div className="grid grid-cols-2 gap-4">
          <Field name="rol" label="Rol" />
          <Field name="etapa" label="Etapa" />
        </div>
        <Field name="estado" label="Estado" type="select" />
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors">
            {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear contacto')}
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}
