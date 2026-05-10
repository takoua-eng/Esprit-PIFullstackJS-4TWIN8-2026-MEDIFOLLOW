import { environment } from 'src/environments/environment';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, combineLatest, map, catchError, of } from 'rxjs';

export interface AdminStats {
  activeUsers:     number;
  totalUsers:      number;
  apiUptime:       number;
  systemErrors:    number;
  pendingAccounts: number;
  lastUpdated:     Date;
}

interface ApiHealthResponse  { uptime: number; errors24h: number; }
interface UserStatsResponse  { active: number; total: number; pending: number; }

@Injectable({ providedIn: 'root' })
export class AdminStatsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  getAdminStats(): Observable<AdminStats> {
    return combineLatest([
      this.http.get<UserStatsResponse>(`${this.base}/admin/users/stats`).pipe(
        catchError(() => of({ active: 0, total: 0, pending: 0 }))
      ),
      this.http.get<ApiHealthResponse>(`${this.base}/admin/health`).pipe(
        catchError(() => of({ uptime: 0, errors24h: 0 }))
      ),
    ]).pipe(
      map(([users, health]) => ({
        activeUsers:     users.active,
        totalUsers:      users.total,
        pendingAccounts: users.pending,
        apiUptime:       health.uptime,
        systemErrors:    health.errors24h,
        lastUpdated:     new Date(),
      }))
    );
  }
}