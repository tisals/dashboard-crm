import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import type {
  ApiResponse,
  DashboardData,
  LoginResponse,
  Entidad,
  EntidadCreate,
  Oportunidad,
  OportunidadCreate,
  Contacto,
  ContactoCreate,
  Seguimiento,
  ContactoAccionPayload,
  CotizacionData,
  DetalleOportunidadBackend,
  DetalleOportunidadCreate,
  Producto,
  ProductoCreate,
  Ciudad,
  CiudadCreate,
  Maestro,
  MaestroCreate,
  Usuario,
  UsuarioCreate,
  SeguridadDashboardData,
  MarcaCreate,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'

const crmApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// Request interceptor: inject Bearer token from localStorage
crmApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token')
  if (token && config.headers) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

// Response interceptor: handle 401 → clear + redirect
crmApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse<unknown>>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

// ── Auth ─────────────────────────────────────────

export async function logout() {
  await crmApi.post('/auth/logout')
}

export async function login(payload: { email: string; password: string }) {
  const { data } = await crmApi.post<LoginResponse>('/auth/login', payload)
  return data
}

// ── Dashboard ────────────────────────────────────

export async function getDashboard(params?: { comercial_id?: number; fecha_inicio?: string; fecha_fin?: string }): Promise<DashboardData> {
  const { data } = await crmApi.get<ApiResponse<DashboardData>>('/dashboard', { params })
  if (!data.success || !data.data) {
    throw new Error(data.error ?? 'Error al obtener dashboard')
  }
  return data.data
}

// ── Entidades ────────────────────────────────────

export async function getEntidades(params?: { search?: string; per_page?: number; estado?: string; sort_by?: string; sort_order?: string; page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Entidad[]; total: number }>>('/entidad', { params })
  return data
}

export async function getEntidad(id: number) {
  const { data } = await crmApi.get<ApiResponse<Entidad>>(`/entidad/${id}`)
  return data
}

export async function createEntidad(payload: EntidadCreate) {
  const { data } = await crmApi.post<ApiResponse<Entidad>>('/entidad', payload)
  return data
}

export async function updateEntidad(id: number, payload: Partial<EntidadCreate>) {
  const { data } = await crmApi.put<ApiResponse<Entidad>>(`/entidad/${id}`, payload)
  return data
}

export async function deleteEntidad(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/entidad/${id}`)
  return data
}

// ── Oportunidades ────────────────────────────────

export interface PaginationInfo {
  total: number
  current_page: number
  last_page: number
  per_page: number
}

export async function getOportunidades(params?: {
  search?: string
  estado?: string
  entidad_id?: number
  producto_id?: number
  fecha_desde?: string
  fecha_hasta?: string
  codigo?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}) {
  const { data } = await crmApi.get<ApiResponse<{ data: Oportunidad[] } & PaginationInfo>>('/oportunidades', { params })
  return data
}

export async function getOportunidad(id: number) {
  const { data } = await crmApi.get<ApiResponse<Oportunidad>>(`/oportunidades/${id}`)
  return data
}

export async function createOportunidad(payload: OportunidadCreate) {
  const { data } = await crmApi.post<ApiResponse<Oportunidad>>('/oportunidades', payload)
  return data
}

export async function updateOportunidad(id: number, payload: Partial<OportunidadCreate>) {
  const { data } = await crmApi.put<ApiResponse<Oportunidad>>(`/oportunidades/${id}`, payload)
  return data
}

export async function deleteOportunidad(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/oportunidades/${id}`)
  return data
}

export async function clonarOportunidad(id: number) {
  const { data } = await crmApi.post<ApiResponse<Oportunidad>>(`/oportunidades/${id}/clonar`)
  return data
}

export async function ganarOportunidad(id: number) {
  const { data } = await crmApi.post<ApiResponse<Oportunidad>>(`/oportunidades/${id}/ganar`)
  return data
}

export async function versionarOportunidad(id: number) {
  const { data } = await crmApi.post<ApiResponse<Oportunidad>>(`/oportunidades/${id}/version`)
  return data
}

export async function getPipelines() {
  const { data } = await crmApi.get<ApiResponse<any[]>>('/pipelines')
  return data
}

// Update only estado (Kanban drag)
export async function updateOportunidadEstado(id: number, estado: string) {
  const { data } = await crmApi.put<ApiResponse<Oportunidad>>(`/oportunidades/${id}`, { estado })
  return data
}

// ── Contactos ────────────────────────────────────

export async function getContactos(params?: { entidad_id?: number; search?: string; per_page?: number; page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Contacto[]; total: number }>>('/contacto', { params })
  return data
}

export async function getContacto(id: number) {
  const { data } = await crmApi.get<ApiResponse<Contacto>>(`/contacto/${id}`)
  return data
}

export async function createContacto(payload: ContactoCreate) {
  const { data } = await crmApi.post<ApiResponse<Contacto>>('/contacto', payload)
  return data
}

export async function updateContacto(id: number, payload: Partial<ContactoCreate>) {
  const { data } = await crmApi.put<ApiResponse<Contacto>>(`/contacto/${id}`, payload)
  return data
}

export async function deleteContacto(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/contacto/${id}`)
  return data
}

// ── Seguimientos ────────────────────────────────

export async function getSeguimientos(params?: {
  oportunidad_id?: number
  contacto_id?: number
  entidad_id?: number
  tipo?: string
  estado?: string
  fecha_desde?: string
  fecha_hasta?: string
  per_page?: number
}) {
  const { data } = await crmApi.get<ApiResponse<{ data: Seguimiento[]; total: number }>>('/seguimientos', { params })
  return data
}

// Registrar acción (llamada/correo/reunión) + programar próximo seguimiento
// POST /contacto/{id}/acciones
export async function contactoAcciones(contactoId: number, payload: ContactoAccionPayload) {
  const { data } = await crmApi.post<ApiResponse<{ seguimientos: Seguimiento[] }>>(
    `/contacto/${contactoId}/acciones`,
    payload,
  )
  return data
}

export async function createSeguimiento(payload: {
  tipo: string
  notas?: string
  fecha?: string
  hora?: string
  estado?: string
  oportunidad_id?: number
  contacto_id?: number
  entidad_id?: number
}) {
  const { data } = await crmApi.post<ApiResponse<Seguimiento>>('/seguimientos', payload)
  return data
}

export async function updateSeguimiento(id: number, payload: Partial<{
  tipo: string
  notas: string
  fecha: string
  hora: string
  estado: string
}>) {
  const { data } = await crmApi.put<ApiResponse<Seguimiento>>(`/seguimientos/${id}`, payload)
  return data
}

export async function deleteSeguimiento(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/seguimientos/${id}`)
  return data
}

// ICS export helpers (downloads raw .ics file)
export function downloadIcsUrl(seguimientoId: number) {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
  // Include token as query param since browser <a> links can't set headers
  const token = localStorage.getItem('auth_token')
  const sep = base.includes('?') ? '&' : '?'
  return `${base}/seguimientos/${seguimientoId}/ics${sep}token=${token}`
}

export function downloadMonthlyCalendarIcsUrl(mes: string, params?: {
  contacto_id?: number
  entidad_id?: number
}) {
  const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8001/api/v1'
  const token = localStorage.getItem('auth_token')
  let url = `${base}/seguimientos/calendar.ics?mes=${mes}&token=${token}`
  if (params?.contacto_id) url += `&contacto_id=${params.contacto_id}`
  if (params?.entidad_id) url += `&entidad_id=${params.entidad_id}`
  return url
}

// ── Cotización ──────────────────────────────────

export async function getCotizacionData(id: number) {
  const { data } = await crmApi.get<ApiResponse<CotizacionData>>(`/oportunidades/${id}/cotizacion-data`)
  return data
}

export async function enviarCotizacion(id: number, body?: { mensaje?: string; contacto_id?: number }) {
  const { data } = await crmApi.post<ApiResponse<CotizacionData>>(`/oportunidades/${id}/enviar`, body ?? {})
  return data
}

export async function aprobarCotizacion(id: number) {
  const { data } = await crmApi.post<ApiResponse<CotizacionData>>(`/oportunidades/${id}/aprobar`)
  return data
}

// ── Seguridad Dashboard ─────────────────────────

export async function getSecurityDashboard() {
  const { data } = await crmApi.get<ApiResponse<SeguridadDashboardData>>('/seguridad/dashboard')
  return data
}

// ── Productos ───────────────────────────────────

export async function getProductos(params?: { search?: string; per_page?: number; page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Producto[]; total: number }>>('/productos', { params })
  return data
}

export async function createProducto(payload: ProductoCreate) {
  const { data } = await crmApi.post<ApiResponse<Producto>>('/productos', payload)
  return data
}

export async function updateProducto(id: number, payload: Partial<ProductoCreate>) {
  const { data } = await crmApi.put<ApiResponse<Producto>>(`/productos/${id}`, payload)
  return data
}

export async function deleteProducto(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/productos/${id}`)
  return data
}

// ── Marcas (Propia) ─────────────────────────────

export async function getMarcas(params?: { search?: string; per_page?: number; page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Entidad[]; total: number }>>('/entidad', {
    params: { ...params, estado: 'Propia' },
  })
  return data
}

export async function createMarca(payload: MarcaCreate) {
  const { data } = await crmApi.post<ApiResponse<Entidad>>('/entidad', { ...payload, estado: 'Propia' })
  return data
}

// getMarcas reuses updateEntidad and deleteEntidad from Entidad CRUD above

// ── Ciudades ────────────────────────────────────

export async function getCiudades(params?: { search?: string; per_page?: number; page?: number; departamento?: string }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Ciudad[]; total: number }>>('/ciudades', { params })
  return data
}

export async function getCiudad(codMunicipio: string) {
  const { data } = await crmApi.get<ApiResponse<Ciudad>>(`/ciudades/${codMunicipio}`)
  return data
}

export async function createCiudad(payload: CiudadCreate) {
  const { data } = await crmApi.post<ApiResponse<Ciudad>>('/ciudades', payload)
  return data
}

export async function updateCiudad(codMunicipio: string, payload: Partial<CiudadCreate>) {
  const { data } = await crmApi.put<ApiResponse<Ciudad>>(`/ciudades/${codMunicipio}`, payload)
  return data
}

export async function deleteCiudad(codMunicipio: string) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/ciudades/${codMunicipio}`)
  return data
}

// ── Maestros ────────────────────────────────────

export async function getMaestros(params?: { search?: string; per_page?: number; page?: number; campo?: string }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Maestro[]; total: number }>>('/maestros', { params })
  return data
}

export async function getMaestro(id: number) {
  const { data } = await crmApi.get<ApiResponse<Maestro>>(`/maestros/${id}`)
  return data
}

export async function createMaestro(payload: MaestroCreate) {
  const { data } = await crmApi.post<ApiResponse<Maestro>>('/maestros', payload)
  return data
}

export async function updateMaestro(id: number, payload: Partial<MaestroCreate>) {
  const { data } = await crmApi.put<ApiResponse<Maestro>>(`/maestros/${id}`, payload)
  return data
}

export async function deleteMaestro(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/maestros/${id}`)
  return data
}

// ── Detalle Oportunidad (líneas de cotización) ──

export async function getDetallesOportunidad(oportunidadId: number) {
  const { data } = await crmApi.get<ApiResponse<DetalleOportunidadBackend[]>>(
    `/oportunidades/${oportunidadId}/detalles`,
  )
  return data
}

export async function createDetalleOportunidad(oportunidadId: number, payload: DetalleOportunidadCreate) {
  const { data } = await crmApi.post<ApiResponse<DetalleOportunidadBackend>>(
    `/oportunidades/${oportunidadId}/detalles`,
    payload,
  )
  return data
}

export async function updateDetalleOportunidad(id: number, payload: Partial<DetalleOportunidadCreate>) {
  const { data } = await crmApi.put<ApiResponse<DetalleOportunidadBackend>>(
    `/detalles-oportunidad/${id}`,
    payload,
  )
  return data
}

export async function deleteDetalleOportunidad(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/detalles-oportunidad/${id}`)
  return data
}

// ── Usuarios ──────────────────────────────────────

export async function getUsuarios(params?: { search?: string; per_page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: Usuario[]; total: number }>>('/usuarios', { params })
  return data
}

export async function getUsuario(id: number) {
  const { data } = await crmApi.get<ApiResponse<Usuario>>(`/usuarios/${id}`)
  return data
}

export async function createUsuario(payload: UsuarioCreate) {
  const { data } = await crmApi.post<ApiResponse<Usuario>>('/usuarios', payload)
  return data
}

export async function updateUsuario(id: number, payload: Partial<UsuarioCreate>) {
  const { data } = await crmApi.put<ApiResponse<Usuario>>(`/usuarios/${id}`, payload)
  return data
}

export async function deleteUsuario(id: number) {
  const { data } = await crmApi.delete<ApiResponse<null>>(`/usuarios/${id}`)
  return data
}

// ── Roles ──────────────────────────────────────────

export async function getRoles(params?: { per_page?: number }) {
  const { data } = await crmApi.get<ApiResponse<{ data: { id: number; nombre: string }[]; total: number }>>('/roles', { params })
  return data
}

// ── Entidad Usuarios (comerciales asignados) ──────

export async function getEntidadUsuarios(entidadId: number) {
  const { data } = await crmApi.get<ApiResponse<Usuario[]>>(`/entidad/${entidadId}/usuarios`)
  return data
}

export async function assignEntidadUsuario(payload: { usuario_id: number; entidad_id: number }) {
  const { data } = await crmApi.post<ApiResponse<any>>('/entidad-usuario', payload)
  return data
}

export async function removeEntidadUsuario(payload: { usuario_id: number; entidad_id: number }) {
  const { data } = await crmApi.delete<ApiResponse<any>>('/entidad-usuario', { data: payload })
  return data
}

export default crmApi
