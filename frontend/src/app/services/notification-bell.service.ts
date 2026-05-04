import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface AppNotification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedUserId?: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationBellService {
  private base = `${API_BASE_URL}/notifications`;

  constructor(private http: HttpClient) {}

  getMyNotifications(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.base);
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<any> {
    return this.http.patch(`${this.base}/read-all`, {});
  }
}
