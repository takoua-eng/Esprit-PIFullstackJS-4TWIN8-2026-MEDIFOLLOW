import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NotificationBellService, AppNotification } from 'src/app/services/notification-bell.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-doctor-notifications',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './doctor-notifications.component.html',
  styleUrls: ['./doctor-notifications.component.scss'],
})
export class DoctorNotificationsComponent implements OnInit {
  notifications: AppNotification[] = [];
  loading = true;
  activeFilter: 'all' | 'unread' | 'read' = 'all';

  constructor(
    private notifService: NotificationBellService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.notifService.getMyNotifications().pipe(
      catchError(() => of([]))
    ).subscribe((notifs: AppNotification[]) => {
      this.notifications = notifs.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      this.loading = false;
    });
  }

  get filtered(): AppNotification[] {
    if (this.activeFilter === 'unread') return this.notifications.filter(n => !n.isRead);
    if (this.activeFilter === 'read')   return this.notifications.filter(n => n.isRead);
    return this.notifications;
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.isRead).length; }

  markRead(n: AppNotification): void {
    if (n.isRead) return;
    this.notifService.markRead(n._id).subscribe(() => { n.isRead = true; });
  }

  markAllRead(): void {
    this.notifService.markAllRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
    });
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = {
      alert: 'alert-triangle', reminder: 'clock', message: 'message',
      info: 'info-circle', success: 'circle-check', user: 'user',
      questionnaire: 'clipboard-list', warning: 'alert-circle',
    };
    return map[type?.toLowerCase()] ?? 'bell';
  }

  getTypeColor(type: string): string {
    const map: Record<string, string> = {
      alert: '#d63031', reminder: '#e17055', message: '#0984e3',
      info: '#6c5ce7', success: '#00b894', user: '#468ecf',
      questionnaire: '#fd79a8', warning: '#fdcb6e',
    };
    return map[type?.toLowerCase()] ?? '#468ecf';
  }

  timeAgo(dateStr: string): string {
    const diff  = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);
    if (mins  < 1)  return 'À l\'instant';
    if (mins  < 60) return `Il y a ${mins}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/doctor']);
  }
}
