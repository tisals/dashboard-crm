import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createEntidad, updateEntidad, getCiudades, getCiudad } from '../api/crmApi'
import type { Entidad, Ciudad } from '../api/types'
import { Loader2, AlertCircle, Search } from 'lucide-react'
import { AxiosError } from 'axios'

interface Props {
  initialData?: Entidad
  onClose: () => void
}

export function MarcaFormModal({ initialData, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? '',
    nombre_comercial: (initialData as any)?.nombre_comercial ?? '',
    identificacion: initialData?.identificacion ?? '',
    dominio: (initialData as any)?.dominio ?? '',
    email: initialData?.email ?? '',
    telefono: (initialData as any)?.telefono ?? '',
    direccion: (initialData as any)?.direccion ?? '',
    ciudad_cod: (initialData as any)?.ciudad_cod ?? '',
    logo: (initialData as any)?.logo ?? '',
  })
  const [ciudadSearch, setCiudadSearch] = useState('')
  const [showCiudadDropdown, setShowCiudadDropdown] = useState(false)
  const [selectedCiudadNombre, setSelectedCiudadNombre] = useState('')
  const ciudadRef = useRef<HTMLDivElement>(null)

  const { data: ciudadesData, isLoading: loadingCiudades } = useQuery({
    queryKey: ['ciudades', ciudadSearch],
    queryFn: () => getCiudades({ search: ciudadSearch || undefined, per_page: 50 }),
  })
  const ciudades: Ciudad[] = (ciudadesData?.data as any)?.data ?? []

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ciudadRef.current && !ciudadRef.current.contains(e.target as Node)) {
        setShowCiudadDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Load ciudad name when editing
  useEffect(() => {
    if (initialData?.ciudad_cod && !selectedCiudadNombre) {
      getCiudad(initialData.ciudad_cod).then(res => {
        const c = (res.data as any)?.data ?? res.data
        if (c?.nombre) setSelectedCiudadNombre(c.nombre)
      }).catch(() => {})
    }
  }, [initialData?.ciudad_cod])

  const handleCiudadInputChange = useCallback((value: string) => {
    setCiudadSearch(value)
    setShowCiudadDropdown(true)
    if (!value.trim()) {
      setForm(prev => ({ ...prev, ciudad_cod: '' }))
    }
  }, [])

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        ...data,
        tipo_persona: isEdit ? (initialData as any).tipo_persona ?? 'Juridica' : 'Juridica',
        estado: 'Propia',
      }
      // ensure empty ciudad_cod is omitted to avoid DB validation
      if (!payload.ciudad_cod) delete (payload as any).ciudad_cod
      return isEdit
        ? updateEntidad(initialData!.id, payload)
        : createEntidad(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marcas'] })
      onClose()
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold text-slate-50 mb-6">
        {isEdit ? 'Editar Marca' : 'Nueva Marca'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Nombre Comercial</label>
          <input
            type="text"
            value={form.nombre_comercial}
            onChange={(e) => setForm({ ...form, nombre_comercial: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">NIT / Identificación</label>
          <input
            type="text"
            value={form.identificacion}
            onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
            placeholder="Opcional para marcas propias"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Dominio Web</label>
          <input
            type="text"
            value={form.dominio}
            onChange={(e) => setForm({ ...form, dominio: e.target.value })}
            placeholder="ej: tecnoinnsoft.com"
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Logo URL</label>
            <input
              type="text"
              value={form.logo}
              onChange={(e) => setForm({ ...form, logo: e.target.value })}
              placeholder="https://ej.com/logo.png"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <div ref={ciudadRef} className="relative">
            <label className="block text-sm text-slate-400 mb-1">Ciudad</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCiudadNombre || ciudadSearch}
                onChange={(e) => handleCiudadInputChange(e.target.value)}
                onFocus={() => setShowCiudadDropdown(true)}
                placeholder="Buscar ciudad..."
                className="w-full px-3 py-2 pl-9 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
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
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-400">
                {(mutation.error as AxiosError<{ error?: string; message?: string; errors?: Record<string, string[]> }>)?.response?.data?.error
                  ?? (mutation.error as any)?.response?.data?.message
                  ?? 'Error al guardar. Intenta de nuevo.'}
              </p>
              {(mutation.error as AxiosError<{ errors?: Record<string, string[]> }>)?.response?.data?.errors && (
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(
                    (mutation.error as AxiosError<{ errors: Record<string, string[]> }>).response!.data!.errors!
                  ).map(([field, msgs]) => (
                    <li key={field} className="text-xs text-red-300">{field}: {msgs.join(', ')}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Marca'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
