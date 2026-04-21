import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

/** Réponse de GET /api/admin/stats — étendre selon le contrat backend. */
export interface AdminStats {
  totalPatients?: number;
  totalPhysicians?: number;
  totalNurses?: number;
  totalCoordinators?: number;
  totalAuditors?: number;
}

export type TrafficViewMode = 'day' | 'month' | 'year';

export interface TrafficChartPoint {
  label: string;
  value: number;
  newPatients?: number;
}

/** Réponse de GET /admin/traffic-stats — alignée sur le backend. */
export interface TrafficStatsResponse {
  visits: number;
  uniqueUsers: number;
  pageViews: number;
  newPatients: number;
  followUpRate: number;
  chartData: TrafficChartPoint[];
}

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly adminBase = `${API_BASE_URL}/admin`;

  getAdminStats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.adminBase}/stats`);
  }

  /** GET /admin/traffic-stats?mode=… */
  getTrafficStats(mode: string): Observable<TrafficStatsResponse> {
    return this.http.get<TrafficStatsResponse>(`${this.adminBase}/traffic-stats`, {
      params: { mode },
    });
  }
}
