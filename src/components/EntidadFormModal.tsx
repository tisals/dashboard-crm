import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  createEntidad,
  updateEntidad,
  getCiudades,
  getCiudad,
  getUsuarios,
  getEntidadUsuarios,
  assignEntidadUsuario,
  removeEntidadUsuario,
  getMaestros,
} from '../api/crmApi'
import type { Entidad, EntidadCreate, Ciudad, Usuario, Maestro } from '../api/types'
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
  tipo_id: string
  identificacion: string
  nombre: string
  nombre_comercial: string
  direccion: string
  ciudad_cod: string
  dominio: string
  linea_negocio: string
  email: string
  telefono: string
  cantidad_empleados: string
  rut: string
  logo: string
  estado: string
  usuario_id: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

export function EntidadFormModal({ entidad, onSuccess, onClose, mode = 'overlay' }: EntidadFormModalProps) {
  const isEdit = !!entidad
  const [form, setForm] = useState<FormState>({
    tipo_persona: 'Natural',
    tipo_id: '',
    identificacion: '',
    nombre: '',
    nombre_comercial: '',
    direccion: '',
    ciudad_cod: '',
    dominio: '',
    linea_negocio: '',
    email: '',
    telefono: '',
    cantidad_empleados: '',
    rut: '',
    logo: '',
    estado: 'Prospecto',
    usuario_id: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [ciudadSearch, setCiudadSearch] = useState('')
  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false)
  const [selectedCiudadNombre, setSelectedCiudadNombre] = useState('')
  const ciudadRef = useRef<HTMLDivElement>(null)

  // Fetch active users for assignment dropdown
  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios', 'list'],
    queryFn: () => getUsuarios({ per_page: 100 }),
  })
  const usuarios: Usuario[] = (usuariosData?.data as any)?.data ?? usuariosData?.data ?? []
  const comerciales = usuarios.filter(u => u.estado === 'Activo')

  // Fetch entity stages from maestro table
  const { data: etapasData } = useQuery({
    queryKey: ['maestros', 'etapa_contacto'],
    queryFn: () => getMaestros({ campo: 'Etapa_contacto', per_page: 100 }),
  })
  const etapasContacto: Maestro[] = (etapasData as any)?.data?.data ?? []
  const estadoOptions = etapasContacto.filter(e => e.habilitado !== '0')

  // Get currently assigned user for this entity if editing
  const { data: assignedUsersRes } = useQuery({
    queryKey: ['entidad-usuarios', entidad?.id],
    queryFn: () => getEntidadUsuarios(entidad!.id),
    enabled: !!entidad?.id,
  })
  const assignedUsers = assignedUsersRes?.data ?? []
  const initialAssignedUserId = assignedUsers[0]?.id

  useEffect(() => {
    if (assignedUsers.length > 0) {
      setForm(prev => ({ ...prev, usuario_id: assignedUsers[0].id.toString() }))
    }
  }, [assignedUsers])

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
    if (!value.trim()) {
      setForm(prev => ({ ...prev, ciudad_cod: '' }))
    }
  }, [])

  useEffect(() => {
    if (entidad) {
      setForm({
        tipo_persona: entidad.tipo_persona === 'Juridica' ? 'Juridica' : 'Natural',
        tipo_id: entidad.tipo_id ?? '',
        identificacion: entidad.identificacion,
        nombre: entidad.nombre,
        nombre_comercial: entidad.nombre_comercial ?? '',
        direccion: entidad.direccion ?? '',
        ciudad_cod: entidad.ciudad_cod ?? '',
        dominio: entidad.dominio ?? '',
        linea_negocio: entidad.linea_negocio ?? '',
        email: entidad.email ?? '',
        telefono: entidad.telefono ?? '',
        cantidad_empleados: entidad.cantidad_empleados?.toString() ?? '',
        rut: entidad.rut ?? '',
        logo: entidad.logo ?? '',
        estado: entidad.estado,
        usuario_id: '',
      })
    }
  }, [entidad])

  function validate(): boolean {
    const errs: FormErrors = {}
    if (!form.identificacion?.trim()) errs.identificacion = 'La identificación es obligatoria'
    if (!form.nombre?.trim()) errs.nombre = 'El nombre es obligatorio'
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
        nombre: form.nombre?.trim() ?? '',
        identificacion: form.identificacion?.trim() ?? '',
        tipo_persona: form.tipo_persona as 'Natural' | 'Juridica',
        tipo_id: form.tipo_id || undefined,
        nombre_comercial: form.nombre_comercial.trim() || undefined,
        estado: form.estado as any,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        cantidad_empleados: form.cantidad_empleados ? Number(form.cantidad_empleados) : undefined,
        ciudad_cod: form.ciudad_cod || undefined,
        direccion: form.direccion || undefined,
        dominio: form.dominio || undefined,
        linea_negocio: form.linea_negocio || undefined,
        rut: form.rut || undefined,
        logo: form.logo || undefined,
      }
      let savedEntity: Entidad
      if (isEdit) {
        const res = await updateEntidad(entidad!.id, payload)
        savedEntity = res.data ?? entidad!
      } else {
        const res = await createEntidad(payload)
        savedEntity = res.data!
      }

      // Sync assigned user
      const newUserId = form.usuario_id ? Number(form.usuario_id) : null
      const oldUserId = initialAssignedUserId ?? null

      if (newUserId !== oldUserId) {
        if (oldUserId) {
          await removeEntidadUsuario({ usuario_id: oldUserId, entidad_id: savedEntity.id })
        }
        if (newUserId) {
          await assignEntidadUsuario({ usuario_id: newUserId, entidad_id: savedEntity.id })
        }
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
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tipo de persona *</label>
            <select value={form.tipo_persona} onChange={(e) => setForm({...form, tipo_persona: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="Natural">Natural</option>
              <option value="Juridica">Jurídica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Tipo ID</label>
            <select value={form.tipo_id} onChange={(e) => setForm({...form, tipo_id: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
              <option value="">Seleccionar...</option>
              <option value="NIT">NIT</option>
              <option value="CC">Cédula de Ciudadanía</option>
              <option value="CE">Cédula de Extranjería</option>
              <option value="TI">Tarjeta de Identidad</option>
              <option value="RUT">RUT</option>
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
          <div>
            <label className="block text-sm text-slate-400 mb-1">Dominio</label>
            <input type="text" value={form.dominio} onChange={(e) => setForm({...form, dominio: e.target.value})}
              placeholder="ej: tecnoinnsoft.com"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Línea de negocio</label>
            <input type="text" value={form.linea_negocio} onChange={(e) => setForm({...form, linea_negocio: e.target.value})}
              placeholder="ej: Seguridad y Salud en el Trabajo"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
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
              <option value="">Seleccionar...</option>
              {estadoOptions.map(e => (
                <option key={e.id} value={e.nombre}>{e.nombre}</option>
              ))}
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
          <div>
            <label className="block text-sm text-slate-400 mb-1">Cantidad de empleados</label>
            <input type="number" min="0" value={form.cantidad_empleados} onChange={(e) => setForm({...form, cantidad_empleados: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">RUT</label>
            <input type="text" value={form.rut} onChange={(e) => setForm({...form, rut: e.target.value})}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Logo URL</label>
            <input type="text" value={form.logo} onChange={(e) => setForm({...form, logo: e.target.value})}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500" />
          </div>
        </div>

        {/* Comercial Asignado */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Comercial Asignado</label>
          <select value={form.usuario_id} onChange={(e) => setForm({...form, usuario_id: e.target.value})}
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500">
            <option value="">Sin comercial asignado</option>
            {comerciales.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} ({u.rol_nombre ?? 'Comercial'})</option>
            ))}
          </select>
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
