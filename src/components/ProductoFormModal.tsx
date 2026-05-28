import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createProducto, updateProducto, getEntidades } from '../api/crmApi'
import type { Producto, Entidad } from '../api/types'
import { Loader2 } from 'lucide-react'

interface Props {
  initialData?: Producto
  onClose: () => void
}

export function ProductoFormModal({ initialData, onClose }: Props) {
  const queryClient = useQueryClient()
  const isEdit = !!initialData

  const { data: empresasPropias } = useQuery({
    queryKey: ['entidades', 'propias'],
    queryFn: () => getEntidades({ estado: 'Propia', per_page: 100 }),
  })

  const opcionesLineaNegocio: Entidad[] = (empresasPropias?.data as any)?.data ?? []

  const [form, setForm] = useState({
    nombre: initialData?.nombre ?? '',
    linea_negocio: initialData?.linea_negocio ?? '',
    iva: initialData?.iva ?? 19,
    vr_unitario: initialData?.vr_unitario ?? 0,
    medida: initialData?.medida ?? 'Und',
    descripcion: initialData?.descripcion ?? '',
    referencia: initialData?.referencia ?? '',
    estado: initialData?.estado ?? 'Activo',
  })

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit
        ? updateProducto(initialData!.id, data)
        : createProducto(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productos'] })
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
        {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
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
          <label className="block text-sm text-slate-400 mb-1">Línea de Negocio</label>
          <select
            value={form.linea_negocio}
            onChange={(e) => setForm({ ...form, linea_negocio: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Seleccionar línea de negocio...</option>
            {opcionesLineaNegocio.map((e) => (
              <option key={e.id} value={e.nombre}>{e.nombre}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">IVA (%)</label>
            <input
              type="number"
              value={form.iva}
              onChange={(e) => setForm({ ...form, iva: Number(e.target.value) })}
              min={0}
              max={100}
              step={1}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Vr. Unitario</label>
            <input
              type="number"
              value={form.vr_unitario}
              onChange={(e) => setForm({ ...form, vr_unitario: Number(e.target.value) })}
              min={0}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Medida</label>
            <select
              value={form.medida}
              onChange={(e) => setForm({ ...form, medida: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Und">Unidad</option>
              <option value="Hora">Hora</option>
              <option value="Día">Día</option>
              <option value="Mes">Mes</option>
              <option value="Global">Global</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Estado</label>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Referencia</label>
          <input
            type="text"
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Error al guardar. Intenta de nuevo.</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
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
