import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { NotificationBellService, AppNotification } from 'src/app/services/notification-bell.service';
import { clearAuthLocalStorage } from 'src/app/core/app-storage';
import { CoreService } from 'src/app/services/core.service';
import { environment } from "src/environments/environment";
@Component({
  selector: 'app-topstrip',
  standalone: true,
  imports: [
    CommonModule, UpperCasePipe, TablerIconComponent,
    MatButtonModule, MatMenuModule, MatTooltipModule, MatDividerModule,
    TranslateModule,
  ],
  templateUrl: './topstrip.component.html',
})
export class AppTopstripComponent implements OnInit, OnDestroy {
  @Input()  showToggle = false;
  @Output() toggleNav  = new EventEmitter<void>();

  selectedLanguage    = localStorage.getItem('app_language') || 'en';
  highContrastEnabled = localStorage.getItem('high_contrast') === 'true';

  availableLanguages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ];

  notifications: AppNotification[] = [];
  unreadCount = 0;
  private notifSub?: Subscription;

  get userEmail(): string {
    try { return JSON.parse(localStorage.getItem('medi_follow_user_data') || '{}').email || ''; }
    catch { return ''; }
  }

  get userRole(): string {
    return localStorage.getItem('user_role') || 'User';
  }

  get unreadNotifs(): AppNotification[] { return this.notifications.filter(n => !n.isRead); }

  get currentUserData(): any {
    try { return JSON.parse(localStorage.getItem('medi_follow_user_data') || '{}'); }
    catch { return {}; }
  }

  get userInitials(): string {
    const data = this.currentUserData;
    const first = data.firstName || data.name || '';
    const last = data.lastName || '';
    if (first && last) {
      return (first.charAt(0) + last.charAt(0)).toUpperCase();
    }
    if (first) {
      return first.substring(0, 2).toUpperCase();
    }
    if (data.email) {
      return data.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  get userAvatar(): string | null {
    const data = this.currentUserData;
    const photoSource = data.photo || data.image || data.avatar;
    
    if (photoSource && typeof photoSource === 'string' && photoSource !== 'null' && photoSource !== 'undefined' && photoSource !== '') {
      let photoPath = photoSource.replace(/\\/g, '/');
      if (photoPath.startsWith('http')) {
        return photoPath;
      } else if (photoPath.startsWith('uploads/')) {
        return `${environment.apiUrl}/${photoPath}`;
      } else {
        return `${environment.apiUrl}/uploads/${photoPath}`;
      }
    }
    return null;
  }

  constructor(
    private translate: TranslateService,
    private notifService: NotificationBellService,
    private core: CoreService,
    private router: Router,
  ) {
    this.translate.onLangChange.subscribe(e => this.selectedLanguage = e.lang);
    this.setHighContrastClass();
  }

  ngOnInit(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.notifSub = interval(30000).pipe(
        startWith(0),
        switchMap(() => this.notifService.getMyNotifications().pipe(catchError(() => of([])))),
      ).subscribe((notifs: AppNotification[]) => {
        this.notifications = notifs.slice(0, 10);
        this.unreadCount   = notifs.filter(n => !n.isRead).length;
      });
    }
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.notifService.markRead(n._id).subscribe(() => {
      n.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    });
    const role = (localStorage.getItem('user_role') || '').toLowerCase();
    if (role === 'doctor' || role === 'physician') {
      this.router.navigate(['/dashboard/doctor/notifications']);
    }
  }

  goToAllNotifications(): void {
    const role = (localStorage.getItem('user_role') || '').toLowerCase();
    if (role === 'doctor' || role === 'physician') {
      this.router.navigate(['/dashboard/doctor/notifications']);
    }
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      alert: 'alert-triangle', reminder: 'clock', message: 'message',
      info: 'info-circle', success: 'circle-check', user: 'user',
    };
    return map[type?.toLowerCase()] ?? 'bell';
  }

  timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  changeLanguage(lang: string): void {
    this.selectedLanguage = lang;
    this.translate.use(lang);
    localStorage.setItem('app_language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    (window as any).triggerGoogleTranslate?.(lang);
  }

  toggleHighContrast(): void {
    this.highContrastEnabled = !this.highContrastEnabled;
    localStorage.setItem('high_contrast', this.highContrastEnabled ? 'true' : 'false');
    this.setHighContrastClass();
  }

  setHighContrastClass(): void {
    document.documentElement.classList.toggle('high-contrast', this.highContrastEnabled);
    document.body.classList.toggle('high-contrast', this.highContrastEnabled);
  }

  goToProfile(): void {
    const role = (localStorage.getItem('user_role') || '').toLowerCase();
    const profileRoutes: Record<string, string> = {
      superadmin: '/super-admin/profile',
      doctor:     '/dashboard/doctor/profile',
      nurse:      '/dashboard/nurse/profile',
      patient:    '/dashboard/patient/profile',
      coordinator:'/admin/coordinator/profile',
    };
    this.router.navigate([profileRoutes[role] || '/dashboard/profile']);
  }

  /** Return true if user is a patient */
  isPatient(): boolean {
    const r = (localStorage.getItem('user_role') || '').toLowerCase();
    return r === 'patient';
  }

  /** Navigate to alerts page for patient */
  goToAlerts(): void {
    this.router.navigate(['/dashboard/patient/alerts']);
  }

  logout(): void {
    clearAuthLocalStorage();
    this.core.clearRole();
    this.router.navigate(['/authentication/login']);
  }
}
