export interface OportunidadPorEstado {
  estado: string
  total: number
}

export interface Actividad {
  id: number
  tipo: 'llamada' | 'email' | 'reunion' | 'nota'
  notas: string | null
  fecha: string
  hora: string | null
  oportunidad_codigo: string | null
  autor: string | null
}

export interface ProspectosData {
  nuevos_leads_mes: number
  tasa_conversion: number
  entidades_por_mes: Record<string, number>
  entidades_convertidas_mes: Record<string, number>
  oportunidades_por_mes: Record<string, number>
  oportunidades_por_estado: OportunidadPorEstado[]
}

export interface FunnelItem {
  estado: string
  total: number
  monto: number
}

export interface VentasData {
  ventas_mes: number
  ventas_por_mes: Record<string, number>
  ltv: number
  funnel: FunnelItem[]
}

export interface ChartData {
  meses: string[]
  entidades_convertidas: number[]
  ventas: number[]
}

export interface DashboardData {
  prospectos: ProspectosData
  ventas: VentasData
  chart: ChartData
  actividades_recientes: Actividad[]
}

export interface LoginResponse {
  success: boolean
  data?: {
    token: string
    usuario: {
      id: number
      nombre: string
      email: string
      rol_id: number
    }
  }
  message?: string
  error?: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// ── Entity types ──────────────────────────────────

export interface Entidad {
  id: number
  nombre: string
  identificacion: string
  tipo_persona: 'Natural' | 'Juridica'
  estado: 'Activo' | 'Inactivo' | 'Prospecto' | 'Propia'
  email?: string
  telefono?: string
  dominio?: string
  nombre_comercial?: string
  direccion?: string
  ciudad_cod?: string
  logo?: string
  created_at: string
}

export type OportunidadEstado = 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Ganada' | 'Perdida'

export interface Oportunidad {
  id: number
  codigo: string
  entidad_id: number
  contacto_id?: number
  fecha: string
  fuente_canal?: string
  estado: OportunidadEstado
  observaciones?: string
  aclaraciones?: string
  validez_oferta?: number
  tiempo_entrega?: string
  forma_pago?: string
  garantia?: string
  created_at: string
  updated_at?: string
  entidad_nombre?: string
  entidad_identificacion?: string
  valor?: number
  detalles?: Array<{
    id: number
    producto_id: number
    concepto?: string
    cantidad: number
    vr_unitario: number
    iva: number
    vr_total: number
    producto?: { id: number; nombre: string; referencia?: string }
  }>
}

export interface EntidadCreate {
  nombre: string
  identificacion?: string
  tipo_persona: 'Natural' | 'Juridica'
  estado?: 'Activo' | 'Inactivo' | 'Prospecto' | 'Propia'
  nombre_comercial?: string
  dominio?: string
  email?: string
  telefono?: string
  ciudad_cod?: string
  direccion?: string
  logo?: string
}

export interface OportunidadCreate {
  entidad_id: number
  contacto_id?: number
  fecha?: string
  fuente_canal?: string
  estado?: OportunidadEstado
  observaciones?: string
}

// ── Ciudad ──────────────────────────────────────

export interface Ciudad {
  cod_municipio: string
  nombre: string
  departamento?: string
}

// ── Maestro ─────────────────────────────────────

export interface Maestro {
  id: number
  nombre: string
  campo: string
  habilitado: string
  created_at: string
  updated_at: string
}

// ── Contacto ─────────────────────────────────────

export interface Contacto {
  id: number
  entidad_id: number
  nombres: string
  apellidos: string
  area?: string
  cargo?: string
  tel_contacto?: string
  movil?: string
  email_contacto?: string
  email_secundario?: string
  rol?: string
  etapa?: string
  estado: string
  created_at: string
  entidad_nombre?: string
}

export interface ContactoCreate {
  entidad_id: number
  nombres: string
  apellidos: string
  area?: string
  cargo?: string
  tel_contacto?: string
  movil?: string
  email_contacto?: string
  email_secundario?: string
  rol?: string
  etapa?: string
}

// ── Seguimiento ──────────────────────────────────

export type SeguimientoTipo = 'Llamada' | 'Correo' | 'Reunion' | 'Nota' | 'Otro'
export type SeguimientoEstado = 'Pendiente' | 'Completado' | 'Cancelado'

export interface Seguimiento {
  id: number
  oportunidad_id?: number
  contacto_id?: number
  entidad_id?: number
  tipo: SeguimientoTipo
  fecha: string
  hora?: string
  fecha_fin?: string
  notas?: string
  autor_id?: number
  estado: SeguimientoEstado
  created_at: string
  oportunidad_codigo?: string
  contacto_nombre?: string
  entidad_nombre?: string
  autor_nombre?: string
}

// ── Detalle Oportunidad (líneas de cotización) ──

export interface DetalleOportunidadBackend {
  id: number
  oportunidad_id: number
  producto_id: number
  concepto?: string
  descripcion?: string
  medida: string
  cantidad: number
  vr_unitario: number
  iva: number
  vr_total: number
  created_at: string
}

export interface DetalleOportunidadCreate {
  producto_id: number
  concepto?: string
  descripcion?: string
  medida?: string
  cantidad: number
  vr_unitario: number
  iva?: number
}

// ── Send Quote ─────────────────────────────────────

export interface EnviarCotizacionRequest {
  mensaje?: string
  contacto_id?: number
}

// ── Usuario ────────────────────────────────────────

export interface Usuario {
  id: number
  nombre: string
  email: string
  rol_id: number
  estado: string
  created_at: string
  rol_nombre?: string
}

export interface UsuarioCreate {
  nombre: string
  email: string
  password?: string
  rol_id: number
  estado?: string
}

// ── Producto ──────────────────────────────────────

export interface Producto {
  id: number
  nombre: string
  precio?: number
  iva?: number
  medida?: string
  estado: string
  linea_negocio?: string
  descripcion?: string
  referencia?: string
  vr_unitario?: number
}

export interface ProductoCreate {
  nombre: string
  linea_negocio?: string
  iva?: number
  estado?: string
  medida?: string
  descripcion?: string
  referencia?: string
  vr_unitario?: number
}

// ── Marca (Propia) ─────────────────────────────────

export interface MarcaCreate {
  nombre: string
  nombre_comercial?: string
  identificacion?: string
  dominio?: string
  email?: string
  telefono?: string
  tipo_identificacion?: string
  digito_verificacion?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  pais?: string
  logo_url?: string
}

// ── Seguridad Dashboard ────────────────────────────

export interface SeguridadKPI {
  total_usuarios: number
  usuarios_activos: number
  total_productos: number
  total_marcas: number
}

export interface RolDistribucion {
  rol: string
  total: number
}

export interface ActividadSeguridad {
  id: number
  tipo: string
  descripcion: string
  fecha: string
  hora: string | null
  usuario: string
}

export interface SeguridadDashboardData {
  kpi: SeguridadKPI
  distribucion_roles: RolDistribucion[]
  actividad_reciente: ActividadSeguridad[]
}

// ── Maestro Create ─────────────────────────────────

export interface MaestroCreate {
  nombre: string
  campo: string
  habilitado: string
}

// ── Ciudad Create ──────────────────────────────────

export interface CiudadCreate {
  cod_municipio: string
  nombre: string
  departamento: string
}

// Payload for contacto/{id}/acciones
export interface ContactoAccionPayload {
  tipo: SeguimientoTipo
  notas: string
  oportunidad_id?: number
  entidad_id?: number
  fecha?: string       // fecha del próximo seguimiento (opcional)
  hora?: string        // hora del próximo seguimiento (opcional)
}

// ── Cotización types ─────────────────────────────

export interface CotizacionData {
  cotizacion_no: string
  opportunity: {
    id: string
    version: string
    sent_at: string
    due_date: number
    observations: string
    aclarations: string
    payment_conditions: string
    guarantees: string
    delivery_time: string
  }
  brand: {
    logo: string
    slogan: string
    name: string
    business_sign: string
  }
  entity: { name: string; city: string }
  contact: { user: { name: string; email: string } }
  detalle_oportunidad: DetalleLinea[]
  subtotal: string
  iva: string
  total_general: string
}

export interface DetalleLinea {
  id?: number
  producto_id?: number | null
  name: string
  unidad: string
  qty: string
  unit_value: string
  total: string
  iva: number
}


