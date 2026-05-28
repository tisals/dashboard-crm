import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createEntidad, updateEntidad, getCiudades, getCiudad } from '../api/crmApi'
import type { Entidad, EntidadCreate, Ciudad } from '../api/types'
import { SlidePanel } from './SlidePanel'
import { Search } from 'lucide-react'

interface EntidadFormModalProps {
  entidad?: Entidad
  onSuccess: () => void
  onClose: () => void
  mode?: 'overlay' | 'split'
}

type FormState = {
  tipo_persona: string
  identificacion: string
  nombre: string
  nombre_comercial: string
  direccion: string
  ciudad_cod: string
  email: string
  telefono: string
  estado: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

export function EntidadFormModal({ entidad, onSuccess, onClose, mode = 'overlay' }: EntidadFormModalProps) {
  const isEdit = !!entidad
  const [form, setForm] = useState<FormState>({
    tipo_persona: 'Natural',
    identificacion: '',
    nombre: '',
    nombre_comercial: '',
    direccion: '',
    ciudad_cod: '',
    email: '',
    telefono: '',
    estado: 'Prospecto',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [ciudadSearch, setCiudadSearch] = useState('')
  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false)
  const [selectedCiudadNombre, setSelectedCiudadNombre] = useState('')
  const ciudadRef = useRef<HTMLDivElement>(null)

  // Buscar ciudades con el texto ingresado
  const { data: ciudadesData, isLoading: loadingCiudades } = useQuery({
    queryKey: ['ciudades', ciudadSearch],
    queryFn: () => getCiudades({ search: ciudadSearch || undefined, per_page: 50 }),
  })
  const ciudades: Ciudad[] = (ciudadesData?.data as any)?.data ?? []

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ciudadRef.current && !ciudadRef.current.contains(e.target as Node)) {
        setShowCiudadDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cargar nombre de ciudad cuando se edita una entidad con ciudad_cod
  useEffect(() => {
    if (entidad?.ciudad_cod) {
      getCiudad(entidad.ciudad_cod).then(res => {
        const c = (res.data as any)?.data ?? res.data
        if (c?.nombre) setSelectedCiudadNombre(c.nombre)
      }).catch(() => {})
    }
  }, [entidad?.ciudad_cod])

  const handleCiudadInputChange = useCallback((value: string) => {
    setCiudadSearch(value)
    setShowCiudadDropdown(true)
    // Si limpia el input, también limpia el código seleccionado
    if (!value.trim()) {
      setForm(prev => ({ ...prev, ciudad_cod: '' }))
    }
  }, [])

  useEffect(() => {
    if (entidad) {
      setForm({
        tipo_persona: entidad.tipo_persona === 'Juridica' ? 'Juridica' : 'Natural',
        identificacion: entidad.identificacion,
        nombre: entidad.nombre,
        nombre_comercial: entidad.nombre_comercial ?? '',
        direccion: entidad.direccion ?? '',
        ciudad_cod: entidad.ciudad_cod ?? '',
        email: entidad.email ?? '',
        telefono: entidad.telefono ?? '',
        estado: entidad.estado,
      })
    }
  }, [entidad])

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.identificacion.trim()) errs.identificacion = 'La identificación es obligatoria'
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Email inválido'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const payload: EntidadCreate = {
        nombre: form.nombre.trim(),
        identificacion: form.identificacion.trim(),
        tipo_persona: form.tipo_persona as 'Natural' | 'Juridica',
        nombre_comercial: form.nombre_comercial.trim() || undefined,
        estado: form.estado as any,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        ciudad_cod: form.ciudad_cod || undefined,
        direccion: form.direccion || undefined,
      }
      if (isEdit) {
        await updateEntidad(entidad!.id, payload)
      } else {
        await createEntidad(payload)
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { errors?: Record<string, string[]>; error?: string } } }
      const serverErrors = axiosErr?.response?.data?.errors
      if (serverErrors) {
        const mapped: FormErrors = {}
        for (const [key, msgs] of Object.entries(serverErrors)) {
          mapped[key as keyof FormErrors] = msgs[0]
        }
        setErrors(mapped)
      } else {
        setErrors({ nombre: axiosErr?.response?.data?.error ?? 'Error al guardar' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <SlidePanel open onClose={onClose} title={isEdit ? 'Editar Entidad' : 'Nueva Entidad'} mode={mode}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tipo de persona *</label>
            <select value={form.tipo_persona} onChange={(e) => setForm({...form, tipo_persona: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="Natural">Natural</option>
              <option value="Juridica">Jurídica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Identificación *</label>
            <input type="text" value={form.identificacion} onChange={(e) => setForm({...form, identificacion: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            {errors.identificacion && <p className="text-red-400 text-xs mt-1">{errors.identificacion}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
          <input type="text" value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre comercial</label>
          <input type="text" value={form.nombre_comercial} onChange={(e) => setForm({...form, nombre_comercial: e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div ref={ciudadRef} className="relative">
            <label className="block text-sm text-slate-400 mb-1">Ciudad</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCiudadNombre || ciudadSearch}
                onChange={(e) => handleCiudadInputChange(e.target.value)}
                onFocus={() => setShowCiudadDropdown(true)}
                placeholder="Buscar ciudad..."
                className="w-full px-3 py-2.5 pl-9 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
            {showCiudadDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600 rounded-xl max-h-48 overflow-y-auto shadow-xl">
                {loadingCiudades ? (
                  <div className="p-3 text-sm text-slate-500 text-center">Buscando...</div>
                ) : ciudades.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500 text-center">Sin resultados</div>
                ) : (
                  ciudades.map((c) => (
                    <button
                      key={c.cod_municipio}
                      type="button"
                      onClick={() => {
                        setForm(prev => ({ ...prev, ciudad_cod: c.cod_municipio }))
                        setSelectedCiudadNombre(c.nombre)
                        setCiudadSearch('')
                        setShowCiudadDropdown(false)
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                        form.ciudad_cod === c.cod_municipio ? 'bg-slate-700 text-teal-400' : 'text-slate-300'
                      }`}
                    >
                      {c.nombre}{c.departamento ? `, ${c.departamento}` : ''}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Estado</label>
            <select value={form.estado} onChange={(e) => setForm({...form, estado: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="Prospecto">Prospecto</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Dirección</label>
          <input type="text" value={form.direccion} onChange={(e) => setForm({...form, direccion: e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
            <input type="text" value={form.telefono} onChange={(e) => setForm({...form, telefono: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-slate-400 hover:text-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button type="submit" disabled={loading} className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white font-medium rounded-xl transition-colors">
            {loading ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear entidad')}
          </button>
        </div>
      </form>
    </SlidePanel>
  )
}
