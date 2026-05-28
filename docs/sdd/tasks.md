# Tasks: Dashboard API Integration

## Phase 1: Backend Dashboard Endpoint (crm-laravel)

- [ ] **1.1** Create `DashboardController::index()` + `GetDashboardUseCase` with 7 aggregation queries (COUNT, SUM, GROUP BY, JOIN) for KPIs, estado chart, 4-week sales, and recent activities. *Files*: `app/Http/Controllers/API/DashboardController.php` (create), `app/Application/UseCases/Dashboard/GetDashboardUseCase.php` (create) *Dep*: none *Verify*: endpoint returns JSON matching spec §1 with seeded data
- [ ] **1.2** Register `GET /api/v1/dashboard` in `routes/api.php` inside `auth:sanctum` group with RBAC middleware. *Files*: `routes/api.php` (modify) *Dep*: T1.1 *Verify*: `200` with valid token, `401` without

## Phase 2: Frontend API Layer & Infrastructure (dashboard-crm)

- [ ] **2.1** Add `@tanstack/react-query` dep + wrap App with `QueryClientProvider` in `App.tsx`. *Files*: `package.json` (modify), `src/App.tsx` (modify) *Dep*: none *Verify*: app renders without react-query errors
- [ ] **2.2** Create `src/api/crmApi.ts` (Axios instance with baseURL, Bearer interceptor, 401 handler, response unwrap) + `src/api/types.ts` (interfaces: `DashboardResponse`, `KPI`, `ChartBar`, `ChartLine`, `Actividad`, `LoginResponse`). *Files*: `src/api/crmApi.ts` (create), `src/api/types.ts` (create) *Dep*: none *Verify*: types compile clean, Axios instance exports
- [ ] **2.3** Create `src/api/dashboard.ts` (`getDashboard()` → GET `/dashboard`) + `src/hooks/useDashboard.ts` (`useQuery` with staleTime 5min, refetchInterval 60s, retry 2). *Files*: `src/api/dashboard.ts` (create), `src/hooks/useDashboard.ts` (create) *Dep*: T2.2 *Verify*: hook returns `{ data, isLoading, isError, refetch }` with correct config

## Phase 3: Dashboard Components (dashboard-crm)

- [ ] **3.1** Create `KPIGrid.tsx` — 4 StatCards (icon + value + label) in responsive grid, currency/percent formatting, empty state shows 0. *Files*: `src/components/dashboard/KPIGrid.tsx` (create) *Dep*: T2.3 *Verify*: renders 4 cards with formatted values
- [ ] **3.2** Create `OportunidadesChart.tsx` — Recharts BarChart with color-per-estado, tooltip "Estado: {n} — {m} oportunidades", empty state "Sin datos para mostrar". *Files*: `src/components/dashboard/OportunidadesChart.tsx` (create) *Dep*: T2.3 *Verify*: renders bars per estado
- [ ] **3.3** Create `VentasChart.tsx` — Recharts LineChart (teal #0D9488, area fill, currency Y-axis, ISO week labels), empty state "Sin ventas este período". *Files*: `src/components/dashboard/VentasChart.tsx` (create) *Dep*: T2.3 *Verify*: renders line with 4 week data points
- [ ] **3.4** Create `ActividadesList.tsx` — 10-item timeline with Lucide icon per `tipo` (Phone/Mail/Calendar/FileText), date-fns relative time, truncated notas (80 chars), empty state "No hay actividades recientes". *Files*: `src/components/dashboard/ActividadesList.tsx` (create) *Dep*: T2.3 *Verify*: renders items with correct icons per tipo
- [ ] **3.5** Create `DashboardSkeleton.tsx` (animated placeholder matching KPIGrid + chart layout) + `DashboardError.tsx` (error message + Retry button calling `refetch()`). *Files*: `src/components/dashboard/DashboardSkeleton.tsx` (create), `src/components/dashboard/DashboardError.tsx` (create) *Dep*: none *Verify*: skeleton animates, error button triggers refetch
- [ ] **3.6** Refactor `DashboardPage.tsx` — replace mock data with `useDashboard()`, render skeleton → error → data states, compose KPIGrid + OportunidadesChart + VentasChart + ActividadesList. *Files*: `src/pages/DashboardPage.tsx` (modify) *Dep*: T3.1–T3.5 *Verify*: page displays real data from backend, loading shows skeleton, error shows retry

## Phase 4: Auth Integration (both projects)

- [ ] **4.1** Create migration `add_slug_to_roles` + update `Rol.php` model + seed slugs in `DatabaseSeeder` + add `rol_slug` to `LoginResponse::toArray()`. *Files*: `crm-laravel/database/migrations/...` (create), `app/Models/Rol.php` (modify), `database/seeders/DatabaseSeeder.php` (modify), `app/Application/DTOs/LoginResponse.php` (modify) *Dep*: none *Verify*: login response includes `rol_slug` field
- [ ] **4.2** Create `src/api/auth.ts` (`login(email, password)` → POST `/auth/login`) + update `AuthContext.tsx` — real API call, store token in localStorage + state, mount token recovery, `logout()` clears all + redirects. *Files*: `src/api/auth.ts` (create), `src/context/AuthContext.tsx` (modify) *Dep*: T4.1, T2.2 *Verify*: login stores token, reload persists session, logout clears + redirects
- [ ] **4.3** Update `ProtectedLayout` (`App.tsx`) — read `isAuthenticated` from AuthContext, redirect to `/login` when false. Wire 401 in Axios interceptor to clear token + redirect. Login form shows inline "Credenciales inválidas". *Files*: `src/App.tsx` (modify), `src/api/crmApi.ts` (modify), `src/pages/LoginPage.tsx` (modify) *Dep*: T4.2 *Verify*: expired token redirects to login, invalid creds show error message
