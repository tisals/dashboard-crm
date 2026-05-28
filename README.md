# Dashboard CRM Tecnoinnsoft

Dashboard administrativo del CRM con diseño **móvil first**.

## 🚀快速start (Quick Start)

```bash
# Instalar dependencias
npm install

# Iniciar desarrollo
npm run dev
```

El proyecto corre en `http://localhost:3000`

## 🎨 Sistema de Diseño

### Dark Mode (default)
| Elemento | Color |
|----------|-------|
| Fondo normal | `bg-slate-950` |
| Fondo énfasis | `bg-teal-800` |
| Fondo inputs | `bg-slate-800` |
| Bordes | `border-slate-500` |
| Texto normal | `text-slate-50` |
| Texto énfasis | `text-teal-500` |

### Light Mode
| Elemento | Color |
|----------|-------|
| Fondo normal | `bg-slate-50` |
| Fondo énfasis | `bg-teal-300` |
| Fondo inputs | `bg-slate-100` |
| Bordes | `border-slate-600` |
| Texto normal | `text-slate-900` |
| Texto énfasis | `text-teal-600` |

### Border Radius
- Todos los elementos: `border-radius: 2rem` (clase `.rounded-xl`)

## 👥 Roles

| Rol | Módulos accesibles | Dashboard |
|-----|-------------------|-----------|
| **super_admin** | Todos | Dashboard |
| **comercial** | Dashboard, Directorio, CRM, Operaciones | CRM |
| **operaciones** | Dashboard, Directorio, Operaciones | Operaciones |
| **admin** | Dashboard, Seguridad, Maestros, Directorio, Talento, Finanzas | Admin |

### Permisos por rol

- **comercial**: CRUD en CRM, Read en Directorio
- **operaciones**: CRUD en Directorio + Operaciones
- **admin**: CRUD en Talento, Finanzas, Directorio, Maestros

## 📁 Estructura

```
src/
├── components/
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── BottomNav.tsx
├── config/
│   └── roles.ts          # Definición de roles y permisos
├── context/
│   ├── AuthContext.tsx   # Autenticación y permisos
│   └── ThemeContext.tsx  # Dark/Light mode
├── pages/
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── DirectorioPage.tsx
│   ├── CRMPage.tsx
│   └── ...
├── App.tsx
├── main.tsx
└── index.css             # Estilos globales
```

## 🔌 Integración API

El dashboard se conecta al CRM Laravel en `http://localhost:8001/api/v1`

### Endpoints utilizados
- Auth: `/auth/login`, `/auth/logout`
- CRUD: todas las entidades del diccionario
- Webhooks: recibir eventos del CRM

## 🛠 Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state)
- React Router v6
- Lucide React (icons)
- Recharts (gráficos)
- React Hook Form + Zod (forms)

## 📱 Responsive

| Breakpoint | Ancho | Layout |
|------------|-------|--------|
| Mobile | < 640px | 1 columna, bottom nav |
| Tablet | 640-1024px | 2 columnas, sidebar colapsable |
| Desktop | > 1024px | 3 columnas, sidebar fija |

## 📝 Notas

- **Dark mode** es el modo por defecto
- Todos los componentes usan las clases de Tailwind del sistema de diseño
- El estado de tema se guarda en `localStorage`
- La autenticación es mock por ahora (usar cualquier email/password)

---

*Dashboard para CRM Tecnoinnsoft - Diseño móvil first*