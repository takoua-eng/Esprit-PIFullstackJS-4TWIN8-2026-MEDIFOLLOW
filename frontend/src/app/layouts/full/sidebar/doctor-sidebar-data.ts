import { NavItem } from './nav-item/nav-item';

/** Sidebar for staff logged in as Physician (doctor daily monitoring). */
export const doctorNavItems: NavItem[] = [
  {
    navCap: 'DOCTOR_MENU',
  },
  {
    displayName: 'DASHBOARD',
    iconName: 'stethoscope',
    route: '/dashboard/doctor',
    bgcolor: 'primary',
    shortcutKey: 'Ctrl+D',
  },
  {
    displayName: 'DOCTOR_ALERTS_NAV',
    iconName: 'bell-ringing',
    route: '/dashboard/doctor/alerts',
    bgcolor: 'warning',
    shortcutKey: 'Ctrl+A',
  },
  {
    displayName: 'DOCTOR_HISTORY_NAV',
    iconName: 'chart-line',
    route: '/dashboard/doctor/history',
    bgcolor: 'secondary',
    shortcutKey: 'Ctrl+H',
  },
  {
    displayName: 'DOCTOR_PRESCRIPTIONS_NAV',
    iconName: 'notes',
    route: '/dashboard/doctor/prescriptions',
    bgcolor: 'secondary',
    shortcutKey: 'Ctrl+P',
  },
  {
    displayName: 'Messages',
    iconName: 'message',
    route: '/dashboard/doctor/messages',
    bgcolor: 'primary',
    shortcutKey: 'Ctrl+M',
  },
  {
    displayName: 'PROFILE',
    iconName: 'user',
    route: '/dashboard/profile',
    bgcolor: 'secondary',
  },
];
