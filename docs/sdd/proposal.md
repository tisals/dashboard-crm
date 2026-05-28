# Proposal: Dashboard con Integración API

## Intent

Reemplazar los 4 KPIs mock, placeholders de gráficos y actividades falsas del dashboard con datos reales desde el backend Laravel mediante un endpoint dedicado de agregaciones y fetching con TanStack Query.

## Scope

### In Scope
- Endpoint `GET /api/v1/dashboard` en Laravel (KPIs + ventas semanales + actividades)
- Capa API frontend: `src/api/{client,auth,dashboard,types}.ts`
- Hook `useDashboard` con TanStack Query (staleTime 5min, polling 60s)
- 4 componentes: KPIGrid, OportunidadesPorEstadoChart (BarChart), VentasSemanalesChart (LineChart), ActividadesRecientesList
- Auth real: `POST /api/v1/auth/login` → token Sanctum → interceptor Bearer
- Agregar `@tanstack/react-query` a package.json
- DashboardSkeleton + DashboardError (loading/error states)
- Botón refresh manual + invalidación de query

### Out of Scope
- Notificaciones de webhook (v2)
- WebSockets / Laravel Reverb (v2)
- RBAC granular en dashboard (todos ven lo mismo)

## Capabilities

### New Capabilities
- `dashboard-kpi`: Agregaciones precalculadas del CRM (total oportunidades, tasa conversión, ventas mes, nuevos leads)
- `dashboard-charts`: Datos estructurados para gráficos (oportunidades por estado, ventas 4 semanas)
- `dashboard-activity`: Últimos 10 seguimientos con autor, código oportunidad, fecha

### Modified Capabilities
- `user-auth`: Login real con Sanctum token + persistencia en store (antes mock hardcodeado)
- `api-client`: Nueva capa Axios con interceptors de autenticación y manejo de errores (antes inexistente)

## Approach

1. **Backend**: `GetDashboardUseCase` → consultas agregadas SQL (COUNT, SUM, GROUP BY) sobre `oportunidades`, `detalle_oportunidad`, `seguimientos`. Una ruta `GET /v1/dashboard` protegida con Sanctum.
2. **Frontend API**: `client.ts` con Axios + interceptor Bearer token. Tipado estricto en `types.ts`.
3. **Data Fetching**: `useDashboard` con `useQuery`, staleTime 5min, refetchInterval 60s. `QueryClientProvider` envuelve App. Refresh manual llama `invalidateQueries`.
4. **Componentes**: KPIGrid (4 cards estilo slate/teal), charts con Recharts, lista de actividades con iconos por tipo. Todos con estados vacío/carga/error.
5. **Auth**: AuthContext llama `POST /auth/login`, guarda token en Zustand + localStorage. Interceptor lo inyecta. Logout limpia todo.

## Affected Areas

| Area | Impact | Descripción |
|------|--------|-------------|
| `crm-laravel/routes/api.php` | Modified | + ruta dashboard |
| `crm-laravel/app/Http/Controllers/API/DashboardController.php` | New | Controller delgado |
| `crm-laravel/app/Application/UseCases/Dashboard/GetDashboardUseCase.php` | New | Lógica agregaciones |
| `dashboard-crm/package.json` | Modified | + @tanstack/react-query |
| `dashboard-crm/src/api/` | New | 4 archivos (client, auth, dashboard, types) |
| `dashboard-crm/src/hooks/useDashboard.ts` | New | TanStack Query hook |
| `dashboard-crm/src/components/dashboard/` | New | 4 componentes |
| `dashboard-crm/src/pages/DashboardPage.tsx` | Modified | Consumir hook, eliminar mock |
| `dashboard-crm/src/context/AuthContext.tsx` | Modified | Login con API real |

## Riesgos

| Riesgo | Prob. | Mitigación |
|--------|-------|------------|
| Estados oportunidad inconsistentes (strings libres) | Medium | Normalizar con COALESCE + mapeo en backend |
| Endpoint sin datos de prueba | Low | Seed en TestDataSeeder del CRM |
| Token expirado sin mecanismo refresh | Low | Interceptor 401 → redirect a /login |

## Rollback Plan

1. **Frontend**: Revertir `DashboardPage.tsx` a mock. Eliminar `src/api/`, `src/hooks/`, `src/components/dashboard/`.
2. **Backend**: Eliminar ruta `GET /v1/dashboard`, borrar Controller y UseCase.
3. **Deps**: `npm uninstall @tanstack/react-query`.

## Dependencias

- `@tanstack/react-query` ^5.x
- Backend Laravel con endpoint `GET /oportunidades`, `GET /seguimientos`, `GET /detalle-oportunidad` funcionales

## Criterios de Éxito

- [ ] `GET /api/v1/dashboard` retorna KPIs + charts + actividades en <500ms (dev SQLite)
- [ ] DashboardPage renderiza datos reales: 4 KPIs, 2 charts, 10 actividades
- [ ] Login real obtiene token y persiste sesión al recargar
- [ ] Polling refresca dashboard cada 60s automáticamente
- [ ] Skeleton visible durante carga, error state con botón retry
