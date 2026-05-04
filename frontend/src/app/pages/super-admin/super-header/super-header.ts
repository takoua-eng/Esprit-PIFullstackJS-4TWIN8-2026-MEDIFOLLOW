// src/app/pages/super-admin/super-header/super-header.component.ts
import { TablerIconComponent } from 'angular-tabler-icons';
import {
  Component, Output, EventEmitter, Input, ViewEncapsulation, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { CoreService } from 'src/app/services/core.service';
import { HighContrastService } from 'src/app/services/high-contrast.service';
import { clearAuthLocalStorage } from 'src/app/core/app-storage';
import { ZoomControlComponent } from 'src/app/layouts/full/header/zoom-control.component';
import { NotificationBellService, AppNotification } from 'src/app/services/notification-bell.service';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/api.config';

@Component({
  selector: 'app-super-header',
  standalone: true,
  imports: [
    CommonModule, RouterModule, NgScrollbarModule,
    TablerIconComponent, MaterialModule, TranslateModule,
    ZoomControlComponent,
  ],
  templateUrl: './super-header.html',
  encapsulation: ViewEncapsulation.None,
})
export class SuperHeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  // Notifications
  notifications: AppNotification[] = [];
  unreadCount = 0;
  private notifSub?: Subscription;

  readonly langs = [
    { code: 'en', label: 'EN', flag: 'ðŸ‡¬ðŸ‡§' },
    { code: 'fr', label: 'FR', flag: 'ðŸ‡«ðŸ‡·' },
    { code: 'ar', label: 'AR', flag: 'ðŸ‡©ðŸ‡¿' },
  ];
  currentLang = localStorage.getItem('app-lang') || 'en';

  constructor(
    private router: Router,
    private translate: TranslateService,
    readonly core: CoreService,
    readonly hcService: HighContrastService,
    private notifService: NotificationBellService,
    private http: HttpClient,
  ) {
    const saved = localStorage.getItem('app-lang') || 'en';
    this.currentLang = saved;
    this.translate.use(saved);
    document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
  }

  ngOnInit(): void {
    const token = localStorage.getItem('accessToken');
    if (token) {
      this.notifSub = interval(30000).pipe(
        startWith(0),
        switchMap(() => this.notifService.getMyNotifications().pipe(catchError(() => of([])))),
      ).subscribe((notifs: AppNotification[]) => {
        this.notifications = notifs.slice(0, 10);
        this.unreadCount = notifs.filter(n => !n.isRead).length;
      });
    }
  }

  ngOnDestroy(): void { this.notifSub?.unsubscribe(); }

  get unreadNotifs(): AppNotification[] { return this.notifications.filter(n => !n.isRead); }
  get readNotifs(): AppNotification[]   { return this.notifications.filter(n => n.isRead); }

  markRead(notif: AppNotification): void {
    if (notif.isRead) return;
    this.notifService.markRead(notif._id).subscribe(() => {
      notif.isRead = true;
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.unreadCount = 0;
    });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      alert: 'alert-triangle', reminder: 'clock', appointment: 'calendar',
      message: 'message', info: 'info-circle', success: 'circle-check',
      warning: 'alert-circle', error: 'circle-x', user: 'user', questionnaire: 'clipboard-list',
    };
    return map[type?.toLowerCase()] ?? 'circle-check';
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  setLang(code: string): void {
    this.currentLang = code;
    localStorage.setItem('app-lang', code);
    this.translate.use(code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
  }

  goToProfile() { this.router.navigate(['/super-admin/profile']); }

  /** Return true if user is a patient */
  isPatient(): boolean {
    const r = (localStorage.getItem('user_role') || '').toLowerCase();
    return r === 'patient';
  }

  /** Navigate to alerts page for patient */
  goToAlerts(): void {
    this.router.navigate(['/dashboard/patient/alerts']);
  }

  logout() {
    clearAuthLocalStorage();
    this.core.clearRole();
    this.router.navigate(['/authentication/login']);
  }
}
