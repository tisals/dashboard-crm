/**
 * Configuración de Roles y Permisos
 * CRM Tecnoinnsoft Dashboard
 * 
 * Roles definidos:
 * - super_admin: Acceso total a todo
 * - comercial: CRM Dashboard + gestión de CRM
 * - operaciones: Directorio de empresas + Operaciones
 * - admin: Talento, Finanzas, Directorio, Dashboard Admin
 */

export type RoleSlug = 'super_admin' | 'comercial' | 'operaciones' | 'admin';

export interface Permission {
  module: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface Role {
  id: number;
  slug: RoleSlug;
  name: string;
  description: string;
  permissions: Permission[];
  modules: string[]; // Módulos visibles para el menú
  dashboard: string; // Dashboard por defecto al hacer login
}

// Módulos disponibles en la aplicación
export const MODULES = {
  DASHBOARD: 'dashboard',
  ERP_DASHBOARD: 'erp-dashboard',
  SEGURIDAD: 'seguridad',
  MAESTROS: 'maestros',
  DIRECTORIO: 'directorio',
  TALENTO: 'talento',
  CRM: 'crm',
  CONTACTOS: 'contactos',
  OPERACIONES: 'operaciones',
  FINANZAS: 'finanzas',
  SEGUIMIENTOS: 'seguimientos',
  USUARIOS: 'usuarios',
  CIUDADES: 'ciudades',
  PRODUCTOS: 'productos',
  MARCAS: 'marcas',
  PIPELINES: 'pipelines',
} as const;

// Definición de permisos por módulo
const allPermissions: Permission[] = [
  { module: MODULES.DASHBOARD, actions: ['read'] },
  { module: MODULES.ERP_DASHBOARD, actions: ['read'] },
  { module: MODULES.SEGURIDAD, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.MAESTROS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.DIRECTORIO, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.TALENTO, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.CRM, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.CONTACTOS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.OPERACIONES, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.FINANZAS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.SEGUIMIENTOS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.USUARIOS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.CIUDADES, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.PRODUCTOS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.MARCAS, actions: ['create', 'read', 'update', 'delete'] },
  { module: MODULES.PIPELINES, actions: ['create', 'read', 'update', 'delete'] },
];

// Roles predefinidos
export const ROLES: Record<RoleSlug, Role> = {
  super_admin: {
    id: 1,
    slug: 'super_admin',
    name: 'Super Administrador',
    description: 'Acceso total al sistema',
    permissions: allPermissions,
    modules: Object.values(MODULES),
    dashboard: 'dashboard',
  },

  comercial: {
    id: 2,
    slug: 'comercial',
    name: 'Comercial / Vendendor',
    description: 'Gestión de CRM y dashboard de ventas',
    permissions: [
      { module: MODULES.DASHBOARD, actions: ['read'] },
      { module: MODULES.DIRECTORIO, actions: ['read'] },
      { module: MODULES.CONTACTOS, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.CRM, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.SEGUIMIENTOS, actions: ['create', 'read', 'update', 'delete'] },
    ],
    modules: [MODULES.DASHBOARD, MODULES.DIRECTORIO, MODULES.CONTACTOS, MODULES.CRM, MODULES.PIPELINES, MODULES.SEGUIMIENTOS],
    dashboard: 'crm',
  },

  operaciones: {
    id: 3,
    slug: 'operaciones',
    name: 'Operaciones',
    description: 'Directorio de empresas y gestión de operaciones',
    permissions: [
      { module: MODULES.DASHBOARD, actions: ['read'] },
      { module: MODULES.DIRECTORIO, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.OPERACIONES, actions: ['create', 'read', 'update', 'delete'] },
    ],
    modules: [MODULES.DASHBOARD, MODULES.DIRECTORIO, MODULES.OPERACIONES, MODULES.SEGUIMIENTOS],
    dashboard: 'operaciones',
  },

  admin: {
    id: 4,
    slug: 'admin',
    name: 'Administrador',
    description: 'Gestión de talento, finanzas, directorio y dashboard admin',
    permissions: [
      { module: MODULES.DASHBOARD, actions: ['read'] },
      { module: MODULES.ERP_DASHBOARD, actions: ['read'] },
      { module: MODULES.SEGURIDAD, actions: ['read'] },
      { module: MODULES.MAESTROS, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.DIRECTORIO, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.TALENTO, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.FINANZAS, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.CIUDADES, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.PRODUCTOS, actions: ['create', 'read', 'update', 'delete'] },
      { module: MODULES.MARCAS, actions: ['create', 'read', 'update', 'delete'] },
    ],
    modules: [MODULES.DASHBOARD, MODULES.ERP_DASHBOARD, MODULES.SEGURIDAD, MODULES.MAESTROS, MODULES.DIRECTORIO, MODULES.TALENTO, MODULES.FINANZAS, MODULES.SEGUIMIENTOS, MODULES.USUARIOS, MODULES.CIUDADES, MODULES.PRODUCTOS, MODULES.MARCAS],
    dashboard: 'admin',
  },
};

// Helper functions
export function hasPermission(roleSlug: RoleSlug, module: string, action: 'create' | 'read' | 'update' | 'delete'): boolean {
  const role = ROLES[roleSlug];
  if (!role) return false;
  
  // Super admin tiene todo
  if (roleSlug === 'super_admin') return true;
  
  const permission = role.permissions.find(p => p.module === module);
  return permission?.actions.includes(action) ?? false;
}

export function canAccessModule(roleSlug: RoleSlug, module: string): boolean {
  const role = ROLES[roleSlug];
  if (!role) return false;
  
  if (roleSlug === 'super_admin') return true;
  
  return role.modules.includes(module);
}

export function getUserDashboard(roleSlug: RoleSlug): string {
  const role = ROLES[roleSlug];
  return role?.dashboard ?? 'dashboard';
}

export function getRoleBySlug(slug: RoleSlug): Role | undefined {
  return ROLES[slug];
}

export function getAllRoles(): Role[] {
  return Object.values(ROLES);
}