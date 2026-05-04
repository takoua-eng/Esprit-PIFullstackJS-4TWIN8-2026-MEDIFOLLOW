import { environment } from '../environments/environment';
import { Injectable, signal, computed } from '@angular/core';
import { AppSettings, defaults } from '../config';

@Injectable({
  providedIn: 'root',
})
export class CoreService {
  private optionsSignal = signal<AppSettings>(defaults);

  // ── Permissions signal ───────────────────────────────────────────
  private permissionsSignal = signal<string[]>(this.loadPermsFromStorage());

  private loadPermsFromStorage(): string[] {
    try {
      const raw = localStorage.getItem('permissions');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getOptions() {
    return this.optionsSignal();
  }

  setOptions(options: Partial<AppSettings>) {
    this.optionsSignal.update((current) => ({ ...current, ...options }));
  }

  userRole = signal<string>('Guest');
  currentUser = signal<any>(null);

  isSuperAdmin = computed(() => this.userRole() === 'SuperAdmin');

  initUserRole() {
    const rawRole = localStorage.getItem('user_role');
    this.userRole.set(rawRole ? this.formatDisplayRole(rawRole) : 'Guest');

    const rawUser = localStorage.getItem('medi_follow_user_data');
    if (rawUser) {
      try {
        this.currentUser.set(JSON.parse(rawUser));
      } catch (e) {
        console.error('Failed to parse user data from localStorage', e);
      }
    }

    this.permissionsSignal.set(this.loadPermsFromStorage());
  }

  /** Sync role & user after login. */
  setUserFromLogin(user: any) {
    if (!user) return;

    localStorage.setItem('medi_follow_user_data', JSON.stringify(user));
    this.currentUser.set(user);

    const roleObj = user.role;
    const roleName: string =
      typeof roleObj === 'string'
        ? roleObj
        : roleObj && typeof roleObj === 'object' && 'name' in roleObj
          ? String(roleObj.name)
          : '';

    const display = this.formatDisplayRole(roleName);
    localStorage.setItem('user_role', roleName);
    this.userRole.set(display);
  }

  clearSession() {
    localStorage.removeItem('user_role');
    localStorage.removeItem('medi_follow_user_data');
    localStorage.removeItem('accessToken');
    this.userRole.set('Guest');
    this.currentUser.set(null);
    this.permissionsSignal.set([]);
  }

  setRoleFromLogin(roleName: string) {
    const display = roleName ? this.formatDisplayRole(roleName) : 'Guest';
    localStorage.setItem('user_role', roleName || '');
    this.userRole.set(display);
  }

  /** Called after login to store and signal permissions */
  setPermissions(perms: string[]): void {
    localStorage.setItem('permissions', JSON.stringify(perms));
    this.permissionsSignal.set(perms);
  }

  clearRole() {
    this.clearSession();
  }

  private formatDisplayRole(r: string | any): string {
    const t = typeof r === 'string' ? r.trim() : '';
    if (!t) return 'Guest';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  getPermissions(): string[] {
    return this.permissionsSignal();
  }

  hasPermission(permission: string): boolean {
    const perms = this.permissionsSignal();

    if (perms.includes('*')) return true;
    if (perms.includes(permission)) return true;

    const [reqDomain] = permission.split(':');
    return perms.some((p) => {
      const [domain, action] = p.split(':');
      return action === '*' && domain === reqDomain;
    });
  }
}