import { NavItem } from './nav-item/nav-item';

/** Sidebar for staff logged in as Nurse (minimal MediFollow navigation). */
export const nurseNavItems: NavItem[] = [
  {
    navCap: 'NURSE_MENU',
  },
  {
    displayName: 'DASHBOARD',
    iconName: 'gauge',
    route: '/dashboard/nurse',
    bgcolor: 'primary',
    shortcutKey: 'Ctrl+D',
  },
  {
    displayName: 'NURSE_ALERTS_NAV',
    iconName: 'bell-ringing',
    route: '/dashboard/nurse/alerts',
    bgcolor: 'warning',
    shortcutKey: 'Ctrl+A',
  },
  {
    displayName: 'NURSE_REMINDERS_NAV',
    iconName: 'calendar-event',
    route: '/dashboard/nurse/reminders',
    bgcolor: 'success',
    shortcutKey: 'Ctrl+R',
  },
  {
    displayName: 'NURSE_MEDICAL_FILE_NAV',
    iconName: 'clipboard-text',
    route: '/dashboard/nurse/medical-file',
    bgcolor: 'secondary',
    shortcutKey: 'Ctrl+M',
  },
  {
    displayName: 'PROFILE',
    iconName: 'user',
    route: '/dashboard/profile',
    bgcolor: 'secondary',
    shortcutKey: 'Ctrl+P',
  },
];
