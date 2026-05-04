import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditLog {
  _id: string;
  // 1. ESSENTIELS
  userId:    string;
  userEmail: string;
  userRole:  string;
  userName:  string;
  action:    string;
  entityType: string;
  entityId:   string;
  // 2. TRAÇABILITÉ
  before: any;
  after:  any;
  // 3. SÉCURITÉ
  status:    'SUCCESS' | 'FAILED';
  ipAddress: string;
  userAgent: string;
  // 4. ANALYSE
  riskLevel:     'NORMAL' | 'SUSPICIOUS' | 'CRITICAL';
  loginAttempts: number;
  sessionId:     string;
  // 5. CONTEXTE
  description: string;
  module:      string;
  // META
  createdAt: string;
}

export interface AuditStats {
  total: number;
  byAction: { _id: string; count: number }[];
  byEntity: { _id: string; count: number }[];
  byUser: { _id: string; count: number }[];
  last24h: { _id: number; count: number }[];
  last7days: { _id: string; count: number }[];
  // Pre-computed
  criticalChanges: number;
  loginCount: number;
  patientModifications: number;
  alertsGenerated: number;
  totalLast7days: number;
}

@Injectable({ providedIn: 'root' })
export class AuditApiService {
  private base = '${environment.apiUrl}/audit';

  constructor(private http: HttpClient) {}

  getLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.base);
  }

  getStats(): Observable<AuditStats> {
    return this.http.get<AuditStats>(`${this.base}/stats`);
  }

  getLog(id: string): Observable<AuditLog> {
    return this.http.get<AuditLog>(`${this.base}/${id}`);
  }

  deleteLog(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
