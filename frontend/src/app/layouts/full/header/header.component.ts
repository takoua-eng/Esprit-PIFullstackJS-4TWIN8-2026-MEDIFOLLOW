import {
  Component, Output, EventEmitter, Input, ViewEncapsulation, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { RouterModule, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { PatientService } from 'src/app/services/patient.service';
import { CoreService } from 'src/app/services/core.service';
import { ZoomControlComponent } from './zoom-control.component';
import { clearAuthLocalStorage } from 'src/app/core/app-storage';
import { NotificationBellService, AppNotification } from 'src/app/services/notification-bell.service';
import { interval, Subscription } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { UserService } from 'src/app/services/users.service';
import { of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/api.config';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, RouterModule, NgScrollbarModule,
    TablerIconsModule, MaterialModule, TranslateModule,
    ZoomControlComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() showToggle = true;
  @Input() toggleChecked = false;
  @Output() toggleMobileNav = new EventEmitter<void>();

  pendingAlertsCount = 0;
  notifications: AppNotification[] = [];
  unreadCount = 0;
  private notifSub?: Subscription;
  currentUser: any = null;

  constructor(
    private router: Router,
    private translate: TranslateService,
    readonly core: CoreService,
    private patientService: PatientService,
    private notifService: NotificationBellService,
    private http: HttpClient,
    private userService: UserService
  ) {}



  
  ngOnInit(): void {
    this.core.initUserRole();

    const patientId = this.patientService.getCurrentPatientId();
    if (patientId) {
      this.patientService.getPendingAlertsCount().subscribe({
        next: (count) => (this.pendingAlertsCount = count),
        error: () => {},
      });
    }

    this.userService.getProfile().subscribe({
      next: (user) => {
        this.currentUser = { ...user };
        if (this.currentUser.photo && typeof this.currentUser.photo === 'string' && this.currentUser.photo !== 'null' && this.currentUser.photo !== 'undefined' && this.currentUser.photo !== '') {
          const photoPath = this.currentUser.photo.replace(/\\/g, '/');
          this.currentUser.photoUrl = photoPath.startsWith('uploads/') || photoPath.startsWith('http')
            ? `http://localhost:3000/${photoPath}`
            : `http://localhost:3000/uploads/${photoPath}`;
        } else {
          this.currentUser.photoUrl = '/assets/images/profile/user-1.jpg';
        }
      },
      error: () => {}
    });

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




  /** Return true when current role has an alerts page we can navigate to */
  canNavigateToAlerts(): boolean {
    const r = (localStorage.getItem('user_role') || '').toLowerCase();
    return r === 'patient' || r === 'nurse' || r === 'physician' || r === 'doctor';
  }



  goToAlerts(): void {
    const r = (localStorage.getItem('user_role') || '').toLowerCase();
    if (r === 'patient') {
      this.router.navigate(['/dashboard/patient/alerts']);
    } else if (r === 'nurse') {
      this.router.navigate(['/dashboard/nurse/alerts']);
    } else if (r === 'physician' || r === 'doctor') {
      this.router.navigate(['/dashboard/doctor/alerts']);
    } else {
      // fallback to generic alerts page
      this.router.navigate(['/dashboard/alerts']);
    }
  }




  goToProfile(): void {
    const r = (localStorage.getItem('user_role') || '').toLowerCase();
    if (r === 'patient') {
      this.router.navigate(['/dashboard/patient/profile']);
    } else {
      this.router.navigate(['/dashboard/profile']);
    }
  }





  logout(): void {
    // Call backend to log the LOGOUT event in audit
    this.http.post(`${API_BASE_URL}/auth/logout`, {}).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      clearAuthLocalStorage();
      this.core.clearRole();
      this.router.navigate(['/authentication/login']);
    });
  }
}
