import { NavItem } from './nav-item/nav-item';

// Sidebar pour l'admin
export const adminNavItems: NavItem[] = [
  { navCap: 'ADMIN' },
  {
    displayName: 'DASHBOARD',
    iconName: 'gauge',
    route: '/dashboard/admin',
    bgcolor: 'primary',
    chip: true,
    chipClass: 'bg-primary text-white',
    chipContent: 'NEW',

  },
  {
    displayName: 'USERS',
    iconName: 'users',
    route: '/dashboard/admin',
    bgcolor: 'secondary',

    children: [
      {
        displayName: 'PATIENTS',
        iconName: 'notes',
        route: '/dashboard/admin/patients',
        bgcolor: 'transparent',

      },
      {
        displayName: 'DOCTORS',
        iconName: 'stethoscope',
        route: '/dashboard/admin/physicians',
        bgcolor: 'transparent',

      },
      {
        displayName: 'NURSES',
        iconName: 'nurse',
        route: '/dashboard/admin/nurses',
        bgcolor: 'transparent',

      },
      {
        displayName: 'COORDINATORS',
        iconName: 'users-group',
        route: '/dashboard/admin/coordinators',
        bgcolor: 'transparent',

      },
      {
        displayName: 'AUDITORS',
        iconName: 'check',
        route: '/dashboard/admin/auditors',
        bgcolor: 'transparent',

      },
    ],

  },
  {
    displayName: 'QUESTIONNAIRE ',
    iconName: 'list',
    route: '/admin/templates',
    bgcolor: 'secondary',
  },
  {
    displayName: 'Profil',
    iconName: 'check',
    route: 'profil',
    bgcolor: 'transparent',

  },
];

// Sidebar pour le coordinator
export const coordinatorNavItems: NavItem[] = [
  { navCap: 'COORDINATOR' },
  {
    displayName: 'DASHBOARD',
    iconName: 'gauge',
    route: '/admin/coordinator',
    bgcolor: 'primary',
    chip: true,
    chipClass: 'bg-primary text-white',
    chipContent: 'NEW',
  },
  {
    displayName: 'MY PATIENTS',
    iconName: 'users-group',
    route: '/admin/coordinator/patients',
    bgcolor: 'transparent',

  },
  {
    displayName: 'REMINDERS',
    iconName: 'bell-ringing',
    route: '/admin/coordinator/reminders',
    bgcolor: 'transparent',

  },
  {
    displayName: 'AI PREDICTION',
    iconName: 'brain',
    route: '/admin/coordinator/prediction',
    bgcolor: 'transparent',
  },
];

// Sidebar pour le patient
export const patientNavItems: NavItem[] = [
  { navCap: 'PATIENT' },
  {
    displayName: 'Dashboard',
    iconName: 'gauge',
    route: '/dashboard/patient/dashboard',
    bgcolor: 'primary',
  },
  {
    displayName: 'Vital Parameters',
    iconName: 'heartbeat',
    route: '/dashboard/patient/parameters',
    bgcolor: 'success',
  },
  {
    displayName: 'Symptoms',
    iconName: 'activity',
    route: '/dashboard/patient/symptoms',
    bgcolor: 'error',
  },
  {
    displayName: 'Questionnaires',
    iconName: 'clipboard-list',
    route: '/dashboard/patient/questionnaires',
    bgcolor: 'primary',
  },
  {
    displayName: 'History',
    iconName: 'history',
    route: '/dashboard/patient/history',
    bgcolor: 'secondary',
  },
  {
    displayName: 'Prescriptions',
    iconName: 'notes',
    route: '/dashboard/patient/prescriptions',
    bgcolor: 'success',
  },
  {
    displayName: 'Messages',
    iconName: 'message',
    route: '/dashboard/patient/messages',
    bgcolor: 'warning',
  },
  {
    displayName: 'Alerts',
    iconName: 'bell',
    route: '/dashboard/patient/alerts',
    bgcolor: 'error',
  },
  {
    displayName: 'Assistant IA',
    iconName: 'robot',
    route: '/dashboard/patient/ai-chat',
    bgcolor: 'primary',
  },
  {
    displayName: 'Profile',
    iconName: 'user',
    route: '/dashboard/patient/profile',
    bgcolor: 'accent',
  },
];

// For backward compatibility, keep navItems as adminNavItems
export const navItems = adminNavItems;

// Sidebar pour le super admin
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
];

// Sidebar pour l'auditor (dans FullComponent)
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
  },
  {
    displayName: 'Coordinateurs',
    iconName: 'users-group',
    route: '/auditor/coordinators',
    bgcolor: 'warning',
  },
  {
    displayName: 'Reminders',
    iconName: 'bell',
    route: '/auditor/reminders',
    bgcolor: 'error',
  },
  {
    displayName: 'Anomalies',
    iconName: 'alert-triangle',
    route: '/auditor/anomalies',
    bgcolor: 'error',
  },
];
