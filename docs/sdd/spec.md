# Dashboard API Integration — Specification

## Purpose

Replace all mock data on the Dashboard with real API data from the Laravel backend. Provides a single aggregation endpoint, a typed API client layer, TanStack Query hooks for data fetching, and real Sanctum-based authentication.

---

## 1. Backend Endpoint: `GET /api/v1/dashboard`

### Request

| Property | Value |
|----------|-------|
| Method | `GET` |
| Path | `/api/v1/dashboard` |
| Auth | **MUST** require Bearer token (Sanctum) |
| Query Params | None |

### Response JSON

```json
{
  "success": true,
  "data": {
    "kpi": {
      "total_oportunidades": 150,
      "tasa_conversion": 36.7,
      "ventas_mes": 125000.00,
      "nuevos_leads_mes": 18
    },
    "oportunidades_por_estado": [
      { "estado": "Borrador", "total": 30 },
      { "estado": "Enviada", "total": 25 },
      { "estado": "Aceptada", "total": 20 },
      { "estado": "Ganada", "total": 55 },
      { "estado": "Perdida", "total": 20 }
    ],
    "ventas_4_semanas": [
      { "semana": "2026-W16", "total": 28000.00 },
      { "semana": "2026-W17", "total": 35000.00 },
      { "semana": "2026-W18", "total": 42000.00 },
      { "semana": "2026-W19", "total": 20000.00 }
    ],
    "actividades_recientes": [
      {
        "id": 1,
        "tipo": "llamada",
        "notas": "Seguimiento cliente",
        "fecha": "2026-05-10",
        "hora": "10:30",
        "oportunidad_codigo": "COT-0015",
        "autor": "Admin Principal"
      }
    ]
  }
}
```

#### Field Types

| Field | Type | Nullable |
|-------|------|----------|
| `kpi.total_oportunidades` | `integer` | No |
| `kpi.tasa_conversion` | `float` (1 decimal) | No |
| `kpi.ventas_mes` | `float` (2 decimals) | Yes (0 if none) |
| `kpi.nuevos_leads_mes` | `integer` | No |
| `oportunidades_por_estado[].estado` | `string` | No |
| `oportunidades_por_estado[].total` | `integer` | No |
| `ventas_4_semanas[].semana` | `string` (ISO week) | No |
| `ventas_4_semanas[].total` | `float` | Yes (0 if none) |
| `actividades_recientes[].id` | `integer` | No |
| `actividades_recientes[].tipo` | `string` | No |
| `actividades_recientes[].fecha` | `string` (date) | No |
| `actividades_recientes[].hora` | `string` (HH:mm) | Yes |
| `actividades_recientes[].oportunidad_codigo` | `string` | Yes |
| `actividades_recientes[].autor` | `string` | Yes |

### Business Logic (Calculations)

| KPI | Formula |
|-----|---------|
| Total oportunidades | `COUNT(*) FROM oportunidades` |
| Tasa conversión | `ROUND(COUNT(estado='Ganada') / NULLIF(COUNT(estado IN ('Ganada','Perdida')), 0) * 100, 1)` |
| Ventas del mes | `SUM(detalle_oportunidad.vr_total)` WHERE `oportunidad.estado='Ganada'` AND MONTH = current |
| Nuevos leads | `COUNT(*) FROM contacto` WHERE `created_at >= first_day_of_month` |
| Oportunidades por estado | `SELECT estado, COUNT(*) GROUP BY estado` |
| Ventas 4 semanas | `SUM(vr_total)` GROUP BY ISO week (last 4 complete + current partial) JOIN detalle_oportunidad WHERE `oportunidad.estado='Ganada'` |
| Actividades recientes | `SELECT top 10 FROM seguimientos ORDER BY created_at DESC` |

### Error Scenarios

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| No token / invalid token | 401 | `{ "success": false, "message": "Unauthenticated." }` |
| Server error / DB failure | 500 | `{ "success": false, "error": "Error interno del servidor" }` |
| Empty DB (no data) | 200 | All KPIs = 0, arrays empty |
| Token expired | 401 | Same as no token — frontend redirects to login |

---

## 2. Frontend Component Specs

### 2.1 KPIGrid

| Property | Spec |
|----------|------|
| Receives | `kpi` object: `{ total_oportunidades, tasa_conversion, ventas_mes, nuevos_leads_mes }` |
| Renders | 4 `StatCard` components in a 2x2 (mobile) / 4-col (desktop) grid |
| Interactions | None (display only) |
| Empty state | Shows `0` or `$0.00` for each KPI |
| Loading | `DashboardSkeleton` shows animated placeholder cards |

**Requirement**: The system SHALL display exactly 4 KPI cards with icon, value, and label. Values with currency SHALL show `$` prefix formatted with 2 decimals. `tasa_conversion` SHALL show `%` suffix.

### 2.2 OportunidadesPorEstadoChart

| Property | Spec |
|----------|------|
| Type | Recharts `BarChart` |
| Receives | `oportunidades_por_estado: Array<{ estado, total }>` |
| Labels | X-axis: estado name; Y-axis: count |
| Empty state | Shows "Sin datos para mostrar" centered |
| Loading | `DashboardSkeleton` placeholder |

**Requirement**: Bars MUST use distinct colors per estado (color map defined in theme config). Tooltip SHALL show "Estado: {name} — {value} oportunidades".

### 2.3 VentasSemanalesChart

| Property | Spec |
|----------|------|
| Type | Recharts `LineChart` |
| Receives | `ventas_4_semanas: Array<{ semana, total }>` |
| Labels | X-axis: ISO week label (e.g. "W16"); Y-axis: currency formatted |
| Time range | Last 4 complete ISO weeks + current partial week |
| Empty state | Shows "Sin ventas este período" |
| Loading | `DashboardSkeleton` placeholder |

**Requirement**: Line SHALL be teal (`#0D9488`) with fill area. Dots SHALL show tooltip with week and `$` formatted total.

### 2.4 ActividadesRecientesList

| Property | Spec |
|----------|------|
| Receives | `actividades_recientes: Array<{ id, tipo, notas, fecha, hora, oportunidad_codigo, autor }>` |
| Max items | 10 (server-constrained) |
| Sort | By date descending (server-sorted) |
| Interactions | Click item SHALL navigate to oportunidad detail (future; no-op for MVP) |
| Empty state | Shows "No hay actividades recientes" |
| Icon per type | `tipo="llamada"` → Phone; `"email"` → Mail; `"reunion"` → Calendar; `"nota"` → FileText |

**Requirement**: Each item SHALL show icon (from Lucide), truncated notas (max 80 chars), relative date (date-fns `formatDistanceToNow`), and oportunidad code.

---

## 3. Integration Specs

### 3.1 API Client (`src/api/crmApi.ts`)

| Property | Value |
|----------|-------|
| Base URL | `http://localhost:8001/api/v1` (dev) / configurable via `VITE_API_BASE_URL` |
| Default headers | `Content-Type: application/json`, `Accept: application/json` |
| Auth | Axios request interceptor injects `Authorization: Bearer {token}` from Zustand authStore |
| Error interceptor | 401 → clear token → redirect to `/login` |
| Timeout | 15000ms |

**Requirement**: The API client MUST be a single Axios instance exported as default. Response interceptor SHALL unwrap `response.data` (i.e. return `{ success, data, message }`). On network error, SHALL throw typed `ApiError`.

### 3.2 TanStack Query Hook (`src/hooks/useDashboard.ts`)

| Property | Value |
|----------|-------|
| Query key | `['dashboard']` |
| Query fn | Calls `GET /api/v1/dashboard` via API client |
| staleTime | 300000ms (5 min) |
| refetchInterval | 60000ms (60s polling) |
| refetchOnWindowFocus | `true` |
| retry | 2 attempts, with exponential backoff |
| Error handling | Returns typed error state with `{ message, status, retry }` |

**Return shape**: `{ data: DashboardResponse | undefined, isLoading, isError, error, refetch }`

**Requirement**: The hook SHALL expose a `refetch` function for manual refresh. `isLoading` SHALL be `true` only on initial fetch (no cached data). Subsequent refetches SHALL use `isFetching` instead.

### 3.3 Auth Integration (`AuthContext.tsx`)

| Property | Value |
|----------|-------|
| Login | `POST /api/v1/auth/login` with `{ email, password }` → receives `{ token, user }` |
| Token storage | Zustand `authStore` + `localStorage` (sync both) |
| Logout | Clears Zustand + localStorage + redirects to `/login` |
| Protected routes | `<ProtectedRoute>` component checks authStore; redirects if no token |
| Initial load | On mount, reads token from localStorage → sets in Zustand → validates |

**Requirement**: The system SHALL validate the token on app mount by calling `GET /api/v1/user` (or checking expiry). If invalid, SHALL clear token and redirect. Login errors (401) SHALL show inline error message "Credenciales inválidas".

---

## 4. Error Handling

| Layer | Error | Recovery |
|-------|-------|----------|
| API Client | Network error | Retry 2x (TanStack Query). Show `DashboardError` with "Error de conexión" and Retry button. |
| API Client | 401 | Clear token, redirect to `/login` |
| API Client | 500 | Show `DashboardError` with "Error del servidor. Intenta más tarde." + Retry button. |
| TanStack Query | Fetch error | `isError` state → renders `DashboardError` |
| TanStack Query | Empty data | Components render their empty states (0 KPIs, "Sin datos") |
| Auth | Invalid credentials | Inline error under login form: "Credenciales inválidas" |
| Auth | Token expired on page load | Silently redirect to `/login` |

### Requirement: Error Recovery

The system SHALL provide a Retry button in `DashboardError` that calls `refetch()`. The system SHALL NOT clear existing data on refetch error (stale-while-revalidate).

---

## 5. Requirement Summary

| Domain | Type | Requirements | Scenarios |
|--------|------|-------------|-----------|
| `dashboard-kpi` | New | 10 | 12 |
| `dashboard-charts` | New | 6 | 8 |
| `dashboard-activity` | New | 4 | 4 |
| `user-auth` | Modified | 4 | 5 |
| `api-client` | Modified | 4 | 5 |
