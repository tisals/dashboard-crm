# Design: Dashboard API Integration

## Technical Approach

Single aggregation endpoint in Laravel (`GET /api/v1/dashboard`) backed by a dedicated UseCase that runs 7 DB queries (4 KPIs, 2 charts, 1 activity list). Frontend consumes via TanStack Query with 5min stale time and 60s polling. Auth upgraded from mock to real Sanctum token flow. Components split into 4 focused units (KPIGrid, 2 charts, activity list) replacing the single monolithic `DashboardPage.tsx`.

Maps to proposal approach §1-4 and covers all spec requirements from spec §1-3.

## Architecture Decisions

### Decision: Eloquent direct queries vs Repository pattern in GetDashboardUseCase

| Option | Tradeoff |
|--------|----------|
| **Eloquent direct** | Simpler for aggregation queries; no repository overhead |
| Repository pattern | Consistent with existing UseCase convention; testable in isolation |

**Choice**: Eloquent queries directly in the UseCase.
**Rationale**: Dashboard queries are read-only aggregation (COUNT, SUM, GROUP BY) over 4+ tables — not entity CRUD. Following `LoginUseCase` precedent which queries Eloquent directly. Repositories would add abstraction without test benefit since we want real DB results.

### Decision: React Context vs Zustand for auth

| Option | Tradeoff |
|--------|----------|
| **React Context** | Existing pattern in codebase; keeps auth as global state |
| Zustand | Simpler for token persistence; no provider nesting |

**Choice**: Modify existing `AuthContext` to call real API.
**Rationale**: AuthContext already wraps the app in `AuthProvider` and is consumed by 4+ components. Replacing with Zustand would require rewriting App.tsx routing guard logic. Token persists in localStorage (already partially implemented in `logout`). The context will call `POST /api/v1/auth/login`, store token in localStorage + state, and validate on mount.

### Decision: `rol_slug` mapping on login

| Option | Tradeoff |
|--------|----------|
| Add `slug` to `roles` table + include in login response | Clean, keeps backend as source of truth; requires migration |
| Map `rol_id` to slug on frontend | Fragile; hardcodes role assumptions in 2 places |

**Choice**: Add `slug` column to `roles` table via migration, include in `LoginResponse`.
**Rationale**: The frontend RBAC system (`roles.ts`) already uses slugs as the canonical key. Without a slug from the backend, the frontend can't determine which role a user has. A migration adds minimal overhead and keeps the contract explicit. The seeder already populates roles — we update it to include slugs.

### Decision: Component granularity

| Option | Tradeoff |
|--------|----------|
| **4 components** (KPIGrid, BarChart, LineChart, ActivityList) | Clear separation; each has its own loading/empty state |
| Single Dashboard component with sub-sections | Fewer files; more complex internal state |

**Choice**: 4 components + 1 container (`DashboardPage.tsx`).
**Rationale**: Each section has different loading states, empty states, and error boundaries. Four focused components also make skeleton/error states testable independently. Matches the existing pattern in `src/components/layout/` where each layout element is a separate file.

## Data Flow

```
[Browser] ──GET /api/v1/dashboard──→ [Laravel Sanctum]
                                          │
                                    [ValidateApiKeyMiddleware]
                                          │ (401 if invalid)
                                    [DashboardController::index]
                                          │
                                    [GetDashboardUseCase]
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
               COUNT(oportunidades)   GROUP BY(estado)     TOP 10 seguimientos
               SUM(vr_total) mes      SUM(vr_total) 4sem   JOIN oportunidad
               COUNT(contacto) mes
                    │                     │                     │
                    └─────────────────────┼─────────────────────┘
                                          │
                              JSON Response (normalized envelope)
                                          │
[Browser] ←────────────────────────────────┘
     │
[Axios interceptor] → 401? → clear token → redirect /login
     │
[TanStack Query useDashboard] → isLoading? → Skeleton
                              → isError? → DashboardError + Retry
                              → data? → components render
     │
[KPIGrid]  [OportunidadesChart]  [VentasChart]  [ActividadesList]
```

## Backend: File Changes (`crm-laravel`)

| File | Action | Description |
|------|--------|-------------|
| `app/Http/Controllers/API/DashboardController.php` | Create | Single `index()` method, delegates to UseCase, returns `successResponse` |
| `app/Application/UseCases/Dashboard/GetDashboardUseCase.php` | Create | 7 aggregation queries via Eloquent, returns typed array |
| `routes/api.php` | Modify | Add `GET /v1/dashboard` inside `auth:sanctum` group with RBAC |
| `app/Application/DTOs/LoginResponse.php` | Modify | Add `rol_slug` to `toArray()` output |
| `app/Models/Rol.php` | Modify | Add `$fillable` include `slug` |
| `database/migrations/XXXX_add_slug_to_roles_table.php` | Create | Add `slug` VARCHAR column to `roles` |
| `database/seeders/DatabaseSeeder.php` | Modify | Update role slugs: `super_admin`, `comercial`, `operaciones`, `admin` |

### Backend: API Contract

**Request**: `GET /api/v1/dashboard` (Bearer token required)

**Response** (normalized envelope):
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
      { "estado": "Ganada", "total": 55 }
    ],
    "ventas_4_semanas": [
      { "semana": "2026-W16", "total": 28000.00 }
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

### Backend: UseCase Queries

```php
// total_oportunidades
Oportunidad::count();

// tasa_conversion
$ganadas = Oportunidad::where('estado', 'Ganada')->count();
$cerradas = Oportunidad::whereIn('estado', ['Ganada', 'Perdida'])->count();
$tasa = $cerradas > 0 ? round($ganadas / $cerradas * 100, 1) : 0;

// ventas_mes
DetalleOportunidad::whereHas('oportunidad', fn($q) =>
    $q->where('estado', 'Ganada')
      ->whereMonth('fecha', now()->month)
      ->whereYear('fecha', now()->year)
)->sum('vr_total');

// nuevos_leads_mes
Contacto::where('created_at', '>=', now()->startOfMonth())->count();

// oportunidades_por_estado
Oportunidad::selectRaw('estado, COUNT(*) as total')
    ->groupBy('estado')
    ->orderBy('total', 'desc')
    ->get();

// ventas_4_semanas — raw SQL for ISO week grouping
DB::select("
    SELECT CONCAT(YEAR(o.fecha), '-W', LPAD(WEEK(o.fecha, 3), 2, '0')) as semana,
           SUM(d.vr_total) as total
    FROM detalle_oportunidad d
    JOIN oportunidad o ON d.oportunidad_id = o.id
    WHERE o.estado = 'Ganada'
      AND o.fecha >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
    GROUP BY YEAR(o.fecha), WEEK(o.fecha, 3)
    ORDER BY semana ASC
");

// actividades_recientes
Seguimiento::with(['oportunidad:id,codigo', 'autor:id,nombre'])
    ->orderBy('created_at', 'desc')
    ->take(10)
    ->get()
    ->map(fn($s) => [
        'id' => $s->id,
        'tipo' => $s->tipo,
        'notas' => $s->notas,
        'fecha' => $s->fecha,
        'hora' => $s->hora,
        'oportunidad_codigo' => $s->oportunidad?->codigo,
        'autor' => $s->autor?->nombre,
    ]);
```

## Frontend: File Changes (`dashboard-crm`)

| File | Action | Description |
|------|--------|-------------|
| `src/api/crmApi.ts` | Create | Axios instance with Bearer interceptor + 401 handler |
| `src/api/types.ts` | Create | TypeScript interfaces: `DashboardResponse`, `KPI`, `ChartData`, `Actividad` |
| `src/api/dashboard.ts` | Create | `getDashboard()` function calling `GET /api/v1/dashboard` |
| `src/api/auth.ts` | Create | `login(email, password)` function calling `POST /api/v1/auth/login` |
| `src/hooks/useDashboard.ts` | Create | TanStack Query hook with `useQuery` |
| `src/components/dashboard/KPIGrid.tsx` | Create | 4 StatCards grid (icon + value + label) |
| `src/components/dashboard/OportunidadesChart.tsx` | Create | Recharts `BarChart` with color map |
| `src/components/dashboard/VentasChart.tsx` | Create | Recharts `LineChart` with teal color |
| `src/components/dashboard/ActividadesList.tsx` | Create | 10-item timeline with Lucide icons |
| `src/components/dashboard/DashboardSkeleton.tsx` | Create | Animated placeholder cards |
| `src/components/dashboard/DashboardError.tsx` | Create | Error state with Retry button |
| `src/pages/DashboardPage.tsx` | Modify | Replace all mock data with `useDashboard` hook |
| `src/context/AuthContext.tsx` | Modify | Real login via API, token persistence, mount validation |
| `package.json` | Modify | Add `@tanstack/react-query` dependency |
| `src/App.tsx` | Modify | Wrap with `QueryClientProvider` |

### Frontend: API Client (`src/api/crmApi.ts`)

```typescript
import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

// Request interceptor: inject Bearer token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap data, handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Frontend: TanStack Query Integration

```typescript
// src/hooks/useDashboard.ts
import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/dashboard';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
    retry: 2,
  });
}
```

### Frontend: Auth Integration (`src/context/AuthContext.tsx`)

- `login(email, password)` calls `POST /api/v1/auth/login` via Axios directly
- On success: stores `token` in localStorage + state, stores `usuario` in state with mapped `rol_slug`
- On 401: throws "Credenciales inválidas" 
- `logout()`: clears localStorage token, clears user state, redirects to `/login`
- On mount: reads token from localStorage, sets in state (no validation call for MVP — token validated on first API call via 401 interceptor)
- Need to include `rol_slug` in backend login response (via new migration)

### Frontend: Component Tree

```
DashboardPage
├── DashboardSkeleton (when isLoading && no cached data)
├── DashboardError (when isError)
│   └── Retry button → refetch()
└── (when data)
    ├── KPIGrid
    │   └── StatCard × 4 (icon, value, label, optional change)
    ├── OportunidadesChart (BarChart)
    ├── VentasChart (LineChart)
    └── ActividadesList
        └── ActividadItem × 10 (icon, notas, fecha, codigo)
```

## Interfaces / Contracts

### Backend-to-Frontend Contract

```typescript
// src/api/types.ts
export interface DashboardResponse {
  success: boolean;
  data: {
    kpi: KPI;
    oportunidades_por_estado: ChartBar[];
    ventas_4_semanas: ChartLine[];
    actividades_recientes: Actividad[];
  };
}

export interface KPI {
  total_oportunidades: number;
  tasa_conversion: number;
  ventas_mes: number;
  nuevos_leads_mes: number;
}

export interface ChartBar {
  estado: string;
  total: number;
}

export interface ChartLine {
  semana: string;
  total: number;
}

export interface Actividad {
  id: number;
  tipo: 'llamada' | 'email' | 'reunion' | 'nota';
  notas: string;
  fecha: string;
  hora: string | null;
  oportunidad_codigo: string | null;
  autor: string | null;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    usuario: {
      id: number;
      nombre: string;
      email: string;
      rol_id: number;
      rol_slug: string;
      estado: string;
    };
  };
}
```

### Backend: GetDashboardUseCase Return

```php
/**
 * @return array{kpi: array, oportunidades_por_estado: array, ventas_4_semanas: array, actividades_recientes: array}
 */
public function execute(): array
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (Backend) | `GetDashboardUseCase` with seeded test DB | PHPUnit Feature test — hit endpoint, assert JSON structure matches spec §1 types |
| Unit (Frontend) | `useDashboard` hook | Mock Axios, verify query key, staleTime, retry config |
| Integration | Full flow: login → dashboard | Cypress or Playwright (future); manual for MVP |
| Integration (Backend) | Empty DB edge case | Seed 0 rows → assert KPIs=0, arrays empty |
| Integration (Backend) | 401 without token | Hit endpoint without header → assert 401 response |
| Component (Frontend) | KPIGrid, charts, list | Render with mock data, verify loading/empty/error states |

## Migration / Rollout

1. **Backend first**: migration (add slug) → seeder → model → UseCase → Controller → route — deploy and test independently
2. **Frontend second**: add `@tanstack/react-query` → api layer → hooks → components → wire into page — test with backend running
3. **Auth last**: update AuthContext to call real login — this changes the auth flow so it's done last, after everything else is verified
4. **Rollback**: revert DashboardPage.tsx to mock; delete new files; `composer remove` on backend route

## Open Questions

- [ ] **`rol_slug` mapping**: Confirm mapping between backend `roles.nombre` and frontend `rol_slug`. E.g. `nombre="Super Administrador"` → `slug="super_admin"`. If role names differ, adjust seeder.
- [ ] **ISO week SQL compatibility**: `WEEK(o.fecha, 3)` is MySQL/MariaDB syntax. SQLite uses `strftime('%W', o.fecha)`. The backend uses MariaDB in prod but SQLite in dev — need DB-agnostic approach or raw SQL per driver.
