import { NavItem } from '../../../../layouts/full/sidebar/nav-item/nav-item';

export const superAdminNavItems: NavItem[] = [
  { navCap: 'Administration' },
  {
    displayName: 'Dashboard',
    iconName: 'gauge',
    route: '/super-admin/dashboard',
    bgcolor: 'primary',
  },
  {
    displayName: 'Utilisateurs',
    iconName: 'users',
    route: '/super-admin/users',
    bgcolor: 'secondary',
  },
  {
    displayName: 'Services',
    iconName: 'building-hospital',
    route: '/super-admin/services',
    bgcolor: 'info',
  },
  {
    displayName: 'Rôles',
    iconName: 'shield-check',
    route: '/super-admin/role',
    bgcolor: 'warning',
  },
  {
    displayName: 'Audit Logs',
    iconName: 'camera',
    route: '/super-admin/audit-logs',
    bgcolor: 'error',
  },
  {
    displayName: 'AI Intelligence',
    iconName: 'brain',
    route: '/super-admin/ai-intelligence',
    bgcolor: 'accent',
  },
  {
    displayName: 'Questionnaires',
    iconName: 'file-text',
    route: '/super-admin/templates',
    bgcolor: 'success',
  },
];

export const auditorNavItems: NavItem[] = [
  { navCap: 'Audit' },
  {
    displayName: 'Dashboard',
    iconName: 'gauge',
    route: '/auditor/dashboard',
    bgcolor: 'primary',
  },
  {
    displayName: 'Patients',
    iconName: 'users',
    route: '/auditor/patients',
    bgcolor: 'secondary',
    permission: 'audit:read',
  },
  {
    displayName: 'Coordinateurs',
    iconName: 'users-group',
    route: '/auditor/coordinators',
    bgcolor: 'warning',
    permission: 'audit:read',
  },
  {
    displayName: 'Reminders',
    iconName: 'bell',
    route: '/auditor/reminders',
    bgcolor: 'error',
    permission: 'audit:read',
  },
  {
    displayName: 'Anomalies',
    iconName: 'alert-triangle',
    route: '/auditor/anomalies',
    bgcolor: 'error',
    permission: 'audit:read',
  },
];
