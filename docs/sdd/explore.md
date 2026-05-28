## Exploration: Dashboard Module — CRM Tecnoinnsoft

### Current State

#### Frontend (`dashboard-crm`)
- **React 18 + TypeScript + Vite** con Tailwind CSS 3 (dark/light mode via `.dark`/`.light` CSS classes)
- **Dependencias instaladas**: Zustand, Axios, Recharts, React Router v6, Lucide, date-fns, clsx — todas en `package.json` pero **ninguna en uso activo**
- **Auth**: Mock user (`super_admin`) en `AuthContext.tsx`, login form sin conexión a API real
- **No existe capa de servicios API** — no hay `src/services/` ni `src/api/`
- **No existe store de estado** — Zustand instalado pero sin stores definidos
- **DashboardPage.tsx**: Datos 100% mock (4 KPIs hardcodeados, 4 actividades mock, placeholders de gráficos)
- **Layout**: Sidebar (desktop), BottomNav (mobile), Header con search, theme toggle y notificaciones

#### Backend (`crm-laravel`, puerto 8001)
- API REST en `http://localhost:8001/api/v1`
- **Auth**: `POST /auth/login` → email + password → devuelve Sanctum token
- **Oportunidades**: `GET /oportunidades` (paginado, filtros: `estado`, `entidad_id`)
- **Seguimientos**: `GET /seguimientos` (paginado, filtros: `tipo`, `estado`, `fecha_desde`, `fecha_hasta`)
- **Contactos**: `GET /contacto` (CRUD completo)
- **Entidades**: `GET /entidad` (CRUD completo)
- **DetalleOportunidad**: tabla `detalle_oportunidad` con `vr_total` (valor total), `producto_id`, `cantidad`
- **NO existe endpoint de dashboard** — no hay agregaciones precalculadas
- **Estados de oportunidad**: `Borrador` (default), más otros (no hay enum definido, se usan strings)
- **Formato de respuesta**: `{ success: bool, data?: ..., message?: ..., error?: ... }`

### What's Missing vs PRD

| PRD Requisito | Estado Actual | Gap |
|---|---|---|
| KPIs (oportunidades, tasa conversión, ventas mes) | Mock data en DashboardPage.tsx | Sin datos reales, sin cálculo de conversión real |
| Gráfico oportunidades por estado (barras) | Placeholder `[Gráfico de barras]` | No implementado con Recharts |
| Gráfico ventas últimas 4 semanas (línea) | Placeholder `[Gráfico de línea]` | No implementado con Recharts |
| Lista actividades recientes (seguimientos) | Mock data en DashboardPage.tsx | Sin datos reales de API |
| Notificaciones de webhooks recibidos | No implementado | No existe UI ni lógica |
| Autenticación real | Mock user hardcodeado | Sin conexión a `POST /auth/login` |
| Integración API real | No existe capa API | Sin servicios, sin stores, sin data fetching |

### Technical Approach for API Integration

**Opción A: Endpoint dedicado de dashboard en Laravel** (Recomendado)

Crear un nuevo endpoint `GET /api/v1/dashboard` en el backend que ejecute todas las consultas agregadas y devuelva un payload único:

```json
{
  "success": true,
  "data": {
    "kpi": {
      "total_oportunidades": 150,
      "oportunidades_por_estado": {
        "Borrador": 30,
        "En Proceso": 45,
        "Ganada": 55,
        "Perdida": 20
      },
      "tasa_conversion": 36.7,
      "ventas_mes": 125000.00,
      "ventas_4_semanas": [
        { "semana": "2026-04-19", "total": 28000 },
        { "semana": "2026-04-26", "total": 35000 },
        { "semana": "2026-05-03", "total": 42000 },
        { "semana": "2026-05-10", "total": 20000 }
      ],
      "nuevos_leads_mes": 18
    },
    "actividades_recientes": [
      {
        "id": 1,
        "tipo": "llamada",
        "notas": "Llamada con Juan Perez",
        "fecha": "2026-05-10",
        "hora": "10:30",
        "oportunidad_codigo": "COT-0015",
        "autor": "Admin Principal"
      }
    ],
    "webhooks_recientes": [
      {
        "id": 1,
        "evento": "oportunidad.created",
        "entidad_nombre": "Acme Corp",
        "created_at": "2026-05-10T10:00:00Z"
      }
    ]
  }
}
```

**Pros**:
- Una sola llamada API → menos round-trips
- Backend tiene acceso directo a la DB (consultas agregadas eficientes)
- Frontend recibe datos listos para renderizar
- Fácil de cachear (Redis/DB)

**Cons**:
- Requiere modificar el backend Laravel
- Menos flexible si cambian los KPIs

**Esfuerzo**: Medium (crear UseCase, Controller, ruta, pruebas)

**Opción B: Múltiples llamadas desde el frontend**

El frontend hace 3-4 llamadas en paralelo:
1. `GET /oportunidades` (con paginación grande o `per_page=all`)
2. `GET /seguimientos?per_page=10&order_by=fecha` (actividades recientes)
3. `GET /contacto` (para nuevos leads)

**Pros**:
- Sin cambios en backend
- Más flexible

**Cons**:
- Múltiples round-trips
- Agregaciones ineficientes desde el frontend (traer todos los registros para contar)
- Paginación complicada para KPIs
- Sin datos de ventas mensuales (necesita sumar `vr_total` de detalles)

**Esfuerzo**: Medium-High (más coordinación, menos eficiente)

### Data Fetching Strategy Recommendation

**Combinación**: Usar **TanStack Query (React Query)** para toda la data fetching.

Fundamento técnico:
- **Zustand está instalado** pero no es la mejor opción para data fetching. Zustand es ideal para estado global del cliente (theme, auth user, UI state).
- **TanStack Query** maneja caching, refetching, stale-while-revalidate, loading/error states, polling — todo lo que necesita el dashboard.
- **Axios + TanStack Query** es el stack estándar React para fetching.

Arquitectura propuesta:

```
src/
├── api/
│   ├── client.ts           # Axios instance con interceptors (baseURL, token, error handling)
│   ├── dashboard.ts        # Funciones para fetch del dashboard endpoint
│   ├── auth.ts             # login, logout, refresh token
│   └── types.ts            # Interfaces para todas las respuestas API
├── hooks/
│   ├── useDashboard.ts     # useQuery hook para dashboard data
│   ├── useAuth.ts          # useQuery/useMutation para auth (reemplazar AuthContext)
│   └── queries/
│       └── keys.ts         # Query keys centralizadas
├── stores/
│   ├── authStore.ts        # Zustand: solo estado de sesión (user, token, role)
│   └── uiStore.ts          # Zustand: sidebar, theme, mobile state (parte ya existe en ThemeContext)
├── pages/
│   └── DashboardPage.tsx   # Refactor: sin mock data, usar hooks
├── components/
│   └── dashboard/
│       ├── KPIGrid.tsx       # Grid de 4 KPIs (reutilizable)
│       ├── KPIChart.tsx      # Componente base para gráficos
│       ├── OportunidadesPorEstadoChart.tsx  # Recharts BarChart
│       ├── VentasSemanalesChart.tsx        # Recharts LineChart
│       ├── ActividadesRecientes.tsx        # Lista de actividades
│       └── NotificacionesWebhook.tsx       # Panel de notificaciones
└── config/
    └── api.ts              # Configuración: baseURL, timeout, headers
```

**Caching strategy**:
- Dashboard data: `staleTime: 5 min`, `refetchInterval: 60s` (polling)
- Auth: `staleTime: Infinity` (solo cambia con login/logout)
- Refetch on focus: `refetchOnWindowFocus: true`

### Component Breakdown Needed

| Componente | Descripción | Datos que necesita |
|---|---|---|
| `KPIGrid` | Grid 2x2 (mobile) / 4 columnas (desktop) de tarjetas KPI | `kpi.total_oportunidades`, `kpi.tasa_conversion`, `kpi.ventas_mes`, `kpi.nuevos_leads_mes` |
| `OportunidadesPorEstadoChart` | BarChart con barras por estado (Borrador, En Proceso, Ganada, Perdida) | `kpi.oportunidades_por_estado` |
| `VentasSemanalesChart` | LineChart con 4 puntos (últimas 4 semanas) | `kpi.ventas_4_semanas` |
| `ActividadesRecientes` | Lista vertical de seguimientos recientes | `actividades_recientes[]` |
| `NotificacionesWebhook` | Panel de notificaciones de webhook (nuevas, badge en Header) | `webhooks_recientes[]` |
| `DashboardSkeleton` | Estado de carga esqueletal para todo el dashboard | N/A |
| `DashboardError` | Estado de error con retry | N/A |

### Mobile Responsiveness

- **KPIs**: Actualmente `grid-cols-2 lg:grid-cols-4` — correcto, 2 columnas en mobile
- **Gráficos**: Actualmente `grid md:grid-cols-2` — los gráficos se apilan en mobile. OK.
- **Actividades**: Ocupa todo el ancho. OK.
- **Notificaciones**: Debería ir al final / como slide-in drawer en mobile
- **BottomNav**: Ya implementado para mobile

### Real-Time Updates

**Opción A: Polling** (Recomendado para MVP)
- TanStack Query `refetchInterval: 60s`
- Simple, funciona con cualquier backend
- El usuario puede hacer pull-to-refresh manual

**Opción B: WebSockets** (Futuro)
- Laravel Reverb o Pusher para eventos en tiempo real
- Webhook events → broadcast → dashboard actualiza automáticamente
- Más complejo, mejor para versión 2

**Opción C: Manual refresh**
- Botón "Actualizar" en el dashboard
- `queryClient.invalidateQueries(['dashboard'])`

**Recomendación**: Polling (60s) + refresh manual para MVP. WebSockets para roadmap.

### Risks

1. **Backend sin endpoint de dashboard**: Si no se crea el endpoint dedicado, el frontend necesitará 3+ llamadas y la agregación de datos de ventas mensuales requerirá traer todos los `DetalleOportunidad` — ineficiente.
2. **Auth no integrada**: El login actual es mock. Sin autenticación real, no hay token para las llamadas API ni RBAC funcional.
3. **Sanctum vs API Key**: El CRM usa Sanctum (token-based) pero también tiene `X-API-Key`. Definir cuál usa el dashboard. Sanctum es la que corresponde (login de usuario real).
4. **Estados de oportunidad**: No hay un enum formal. Pueden haber inconsistencias en los valores de `estado` entre registros.
5. **TanStack Query no está instalado**: Habrá que agregarlo (`@tanstack/react-query`). No está en `package.json`.

### Ready for Proposal
**Yes**. El análisis está completo. La arquitectura es clara:
1. Backend: crear endpoint `GET /api/v1/dashboard` con UseCase dedicado
2. Frontend: agregar TanStack Query, crear capa API, refactorizar DashboardPage con componentes atómicos
3. Reemplazar mock data por hooks reales
4. Agregar polling + refresh manual

El siguiente paso es `sdd-propose` para formalizar el alcance del cambio.
