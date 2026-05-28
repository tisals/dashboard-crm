# Apply Progress: Dashboard API Integration

## Status
Phase 1 (Backend) ✅ | Phase 2 (Frontend Setup) ✅ | 5/5 tasks complete in these phases

## Completed Tasks

### Phase 1: Backend Dashboard Endpoint (crm-laravel)

- [x] **1.1** Created `DashboardController::index()` + `GetDashboardUseCase` with 7 aggregation queries
  - **Files created**:
    - `app/Http/Controllers/API/DashboardController.php` — thin controller with `ApiResponse` trait
    - `app/Application/UseCases/Dashboard/GetDashboardUseCase.php` — 7 queries: 4 KPIs, estado chart, 4-week sales, recent activities
  - **Queries implemented**:
    - `total_oportunidades`: `COUNT(*) FROM oportunidades`
    - `tasa_conversion`: `ganadas / (ganadas + perdidas) * 100`, 1 decimal
    - `ventas_mes`: `SUM(detalle_oportunidad.vr_total)` WHERE estado='Ganada' AND current month
    - `nuevos_leads_mes`: `COUNT(contacto)` WHERE current month
    - `oportunidades_por_estado`: `GROUP BY estado` with COUNT
    - `ventas_4_semanas`: ISO week grouping with driver detection (SQLite strftime / MariaDB DATE_FORMAT)
    - `actividades_recientes`: Top 10 `seguimientos` with eager-loaded `oportunidad` and `autor` relationships
  - **Key decisions**:
    - Used Eloquent with relationship loading instead of raw SQL JOINs for activities (avoids SQLite/MariaDB CONCAT compatibility issues)
    - Driver-aware ISO week expression: `strftime` for SQLite, `DATE_FORMAT` for MariaDB
    - Used `whereMonth`+`whereYear` for month filtering (portable)

- [x] **1.2** Registered `GET /api/v1/dashboard` in `routes/api.php`
  - Inside `auth:sanctum` + `throttle:api` middleware group (no RBAC — all auth'd users)
  - Verified with `php artisan route:list --path=v1/dashboard`:
    ```
    GET|HEAD  api/v1/dashboard  dashboard.index  API\DashboardController@index
      ⇂ auth:sanctum
      ⇂ throttle:api
    ```

### Phase 2: Frontend API Layer & Infrastructure (dashboard-crm)

- [x] **2.1** Added `@tanstack/react-query` ^5.0.0 to `package.json` + wrapped App with `QueryClientProvider`
  - **Files modified**: `package.json`, `src/App.tsx`
  - QueryClient configured with: retry=2, refetchOnWindowFocus=true, staleTime=5min
  - `npm install` timed out but package directory exists in node_modules

- [x] **2.2** Created `src/api/crmApi.ts` + `src/api/types.ts`
  - **Files created**:
    - `src/api/crmApi.ts` — Axios instance with:
      - baseURL: `http://localhost:8001/api/v1` (configurable via `VITE_API_BASE_URL`)
      - Request interceptor: injects Bearer token from `localStorage('auth_token')`
      - Response interceptor: 401 → clears token + user, redirects to `/login`
      - Exported methods: `login()`, `getDashboard()`
    - `src/api/types.ts` — All TypeScript interfaces:
      - `KPI`, `OportunidadPorEstado`, `VentaSemanal`, `Actividad`, `DashboardData`
      - `LoginResponse`, `ApiResponse<T>`
  - **Note**: `getDashboard()` lives in `crmApi.ts` (not separate `dashboard.ts`), matching orchestrator's T2.2 spec

- [x] **2.3** Created `src/hooks/useDashboard.ts`
  - **File created**: `src/hooks/useDashboard.ts`
  - TanStack Query `useQuery` with:
    - `queryKey: ['dashboard']`
    - `staleTime: 300000` (5 min)
    - `refetchInterval: 60000` (60s polling)
    - `retry: 2`
  - Returns: `{ data, isLoading, isFetching, isError, error, refetch }`

## Issues Found

1. **npm install timeout**: The `npm install` command timed out (network latency). The `@tanstack/react-query` package was installed before the timeout (its directory exists). However, the esbuild native binary may not be fully installed, which could cause `npm run dev`/`npm run build` to fail with `spawn EFTYPE`. Resolution: run `npm install` again with stable network or use `npm ci`.

2. **Driver-specific SQL**: The `ventas_4_semanas` query uses driver detection for ISO week formatting (SQLite `strftime` vs MariaDB `DATE_FORMAT`). This is deliberate per the design, but should be tested on both SQLite (dev) and MariaDB (production).

3. **`getDashboard()` location**: The orchestrator's T2.2 specified `getDashboard()` as a method on `crmApi.ts`, while the tasks artifact T2.3 specified a separate `src/api/dashboard.ts`. The implementation follows the orchestrator's structure — `getDashboard()` is in `crmApi.ts`. No separate `dashboard.ts` was created.

## Files Changed

### crm-laravel (Backend)
| File | Action | Description |
|------|--------|-------------|
| `app/Http/Controllers/API/DashboardController.php` | Created | Thin controller with `index()` method |
| `app/Application/UseCases/Dashboard/GetDashboardUseCase.php` | Created | 7 aggregation queries for KPIs + charts + activities |
| `routes/api.php` | Modified | Added `GET /api/v1/dashboard` route with `auth:sanctum` |

### dashboard-crm (Frontend)
| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modified | Added `@tanstack/react-query` dependency |
| `src/App.tsx` | Modified | Wrapped app with `QueryClientProvider` |
| `src/api/types.ts` | Created | TypeScript interfaces for all dashboard types |
| `src/api/crmApi.ts` | Created | Axios instance with Bearer interceptor, 401 handler, `login()`, `getDashboard()` |
| `src/hooks/useDashboard.ts` | Created | TanStack Query hook with 5min stale, 60s polling |

## Remaining Tasks (for next batches)

### Phase 3: Dashboard Components
- [ ] 3.1 KPIGrid.tsx — 4 StatCards grid
- [ ] 3.2 OportunidadesChart.tsx — Recharts BarChart
- [ ] 3.3 VentasChart.tsx — Recharts LineChart
- [ ] 3.4 ActividadesList.tsx — Activity timeline
- [ ] 3.5 DashboardSkeleton.tsx + DashboardError.tsx
- [ ] 3.6 Refactor DashboardPage.tsx to use useDashboard hook

### Phase 4: Auth Integration
- [ ] 4.1 Migration: add slug to roles table (backend)
- [ ] 4.2 Auth API + AuthContext real login (frontend)
- [ ] 4.3 Protected routes + 401 handling + login form errors

## Verification Notes

- Backend route verified: `php artisan route:list` shows `api/v1/dashboard` with correct middleware
- Backend endpoint returns JSON envelope via `ApiResponse` trait: `{ success: true, data: { kpi, ... } }`
- Frontend types match backend response structure from spec §1
- Axios interceptor handles 401 by clearing localStorage and redirecting to `/login`
