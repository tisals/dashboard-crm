import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, Loader2, ArrowRight, ArrowLeftRight, Briefcase } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getOportunidad, updateOportunidad } from '../api/crmApi'
import type { Oportunidad } from '../api/types'
import { OportunidadSearchSelect } from './OportunidadSearchSelect'

type Mode = 'mover' | 'swap'

interface ReasignarOportunidadModalProps {
  /** La opp actual listada en el directorio (de la entidad que el usuario está viendo) */
  oportunidadActual: Oportunidad
  /** Nombre de la entidad actual del directorio (para mostrar en el resumen) */
  entidadActualNombre: string
  onClose: () => void
  onSuccess?: () => void
}

export function ReasignarOportunidadModal({
  oportunidadActual,
  entidadActualNombre,
  onClose,
  onSuccess,
}: ReasignarOportunidadModalProps) {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('mover')
  const [oppSeleccionada, setOppSeleccionada] = useState<Oportunidad | null>(null)
  const [oppSeleccionadaEntidad, setOppSeleccionadaEntidad] = useState<string>('')
  const [confirmStep, setConfirmStep] = useState(false)

  // Cerrar con Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Resetear selección al cambiar modo
  useEffect(() => {
    setOppSeleccionada(null)
    setOppSeleccionadaEntidad('')
    setConfirmStep(false)
  }, [mode])

  // Cargar el nombre de la entidad origen cuando eligen una opp
  useEffect(() => {
    if (!oppSeleccionada || !oppSeleccionada.entidad_id) {
      setOppSeleccionadaEntidad('')
      return
    }
    // Si la opp seleccionada pertenece a la misma entidad que estamos viendo, no tiene sentido swap
    if (oppSeleccionada.entidad_id === oportunidadActual.entidad_id) {
      setOppSeleccionadaEntidad('(esta misma entidad)')
    } else {
      setOppSeleccionadaEntidad(oppSeleccionada.entidad_nombre ?? `#${oppSeleccionada.entidad_id}`)
    }
  }, [oppSeleccionada, oportunidadActual.entidad_id])

  const reasignar = useMutation({
    mutationFn: async () => {
      if (!oppSeleccionada) throw new Error('No hay opp seleccionada')

      if (mode === 'mover') {
        // Modo "Agregar": tomar la opp seleccionada de su entidad actual y moverla a esta entidad.
        // La opp listada originalmente (oportunidadActual) queda en esta entidad.
        // Resultado: esta entidad queda con DOS opps.
        return updateOportunidad(oppSeleccionada.id, {
          entidad_id: oportunidadActual.entidad_id!,
        })
      }

      // Modo "swap": intercambiar las dos opps.
      // - La opp listada (oportunidadActual) se mueve a la entidad de la opp seleccionada.
      // - La opp seleccionada se mueve a esta entidad.
      if (oppSeleccionada.entidad_id == null) {
        throw new Error('La opp seleccionada no tiene entidad origen')
      }
      // Ejecutar en orden: primero la seleccionada (esto es destructivo si falla la 2da),
      // después la actual.
      await updateOportunidad(oppSeleccionada.id, { entidad_id: oportunidadActual.entidad_id! })
      try {
        await updateOportunidad(oportunidadActual.id, { entidad_id: oppSeleccionada.entidad_id })
      } catch (e) {
        // Rollback: devolver la opp seleccionada a su entidad original
        await updateOportunidad(oppSeleccionada.id, { entidad_id: oppSeleccionada.entidad_id }).catch(() => {})
        throw e
      }
      // Devolver la primera opp para que el caller tenga un response
      return getOportunidad(oportunidadActual.id).then(r => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entidades'] })
      queryClient.invalidateQueries({ queryKey: ['oportunidades'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      // Invalidar específicamente la lista de opps del directorio
      queryClient.invalidateQueries({ queryKey: ['oportunidades', 'byEntidad'] })
      onSuccess?.()
      onClose()
    },
  })

  const canProceed = !!oppSeleccionada
  const isSameEntity = oppSeleccionada?.entidad_id === oportunidadActual.entidad_id
  const swapValid = mode === 'swap' && !isSameEntity && oppSeleccionada != null

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-slate-200">Modificar oportunidad</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {/* Opp actual info */}
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Oportunidad actual</p>
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-teal-400" />
                <span className="font-mono text-sm text-slate-200">{oportunidadActual.codigo}</span>
                <span className="text-xs text-slate-500">en</span>
                <span className="text-sm text-slate-200">{entidadActualNombre}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setMode('mover')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'mover'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowRight size={14} />
                Agregar
              </button>
              <button
                type="button"
                onClick={() => setMode('swap')}
                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === 'swap'
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowLeftRight size={14} />
                Reemplazar (swap)
              </button>
            </div>

            {/* Descripción del modo */}
            <p className="text-xs text-slate-400">
              {mode === 'mover' ? (
                <>
                  La oportunidad que elijas se va a <strong className="text-slate-300">quitar de su entidad actual</strong> y se va a <strong className="text-slate-300">vincular a esta entidad</strong> ({entidadActualNombre}). La opp listada arriba seguirá aquí.
                </>
              ) : (
                <>
                  La oportunidad que elijas va a <strong className="text-slate-300">intercambiarse</strong> con la listada arriba. La nueva se vincula aquí, y la actual se mueve a la entidad de origen.
                </>
              )}
            </p>

            {/* Buscador de opp */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Buscar oportunidad a {mode === 'mover' ? 'agregar' : 'intercambiar'}
              </label>
              <OportunidadSearchSelect
                value={null}
                showAll
                filterByEntidadId={null}
                placeholder="Código o nombre de cliente..."
                onChange={(id, opp) => {
                  setOppSeleccionada(opp ?? null)
                }}
              />
            </div>

            {/* Validación de entidad origen */}
            {oppSeleccionada && (
              <div className={`rounded-xl p-3 border ${
                isSameEntity
                  ? 'bg-amber-900/30 border-amber-700'
                  : 'bg-slate-800 border-slate-700'
              }`}>
                <p className="text-xs text-slate-400 mb-1">Entidad de origen</p>
                <p className="text-sm text-slate-200">
                  {oppSeleccionada.entidad_nombre ?? `#${oppSeleccionada.entidad_id}`}
                </p>
                {isSameEntity && mode === 'swap' && (
                  <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} />
                    No se puede hacer swap con una opp de la misma entidad.
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {reasignar.isError && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                <div className="text-xs text-red-300">
                  Error: {(reasignar.error as Error)?.message ?? 'No se pudo reasignar'}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 transition-colors"
              disabled={reasignar.isPending}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => setConfirmStep(true)}
              disabled={!canProceed || (mode === 'swap' && isSameEntity)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 disabled:text-slate-500 text-white transition-colors"
            >
              {mode === 'mover' ? 'Continuar' : 'Continuar'}
            </button>
          </div>

          {/* Confirm dialog (modal apilado) */}
          {confirmStep && oppSeleccionada && (
            <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center p-6">
              <div className="bg-slate-900 border border-slate-600 rounded-xl p-5 max-w-sm w-full shadow-2xl">
                <h3 className="text-base font-semibold text-slate-200 mb-3">Confirmar cambio</h3>

                {mode === 'mover' ? (
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>
                      Vas a <strong className="text-teal-400">quitar</strong> la opp{' '}
                      <span className="font-mono">{oppSeleccionada.codigo}</span> de{' '}
                      <strong>{oppSeleccionada.entidad_nombre ?? `entidad #${oppSeleccionada.entidad_id}`}</strong>{' '}
                      y <strong className="text-teal-400">vincularla</strong> a{' '}
                      <strong>{entidadActualNombre}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-slate-300">
                    <p>
                      Vas a <strong className="text-teal-400">intercambiar</strong>:
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1 ml-2">
                      <li>
                        <span className="font-mono">{oportunidadActual.codigo}</span> →{' '}
                        <strong>{oppSeleccionadaEntidad}</strong>
                      </li>
                      <li>
                        <span className="font-mono">{oppSeleccionada.codigo}</span> →{' '}
                        <strong>{entidadActualNombre}</strong>
                      </li>
                    </ul>
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setConfirmStep(false)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                    disabled={reasignar.isPending}
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={() => reasignar.mutate()}
                    disabled={reasignar.isPending}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white"
                  >
                    {reasignar.isPending ? (
                      <span className="flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" />
                        Aplicando...
                      </span>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
