import { environment } from "src/environments/environment";
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface ClinicalReviewQueueItemDto {
  queueId: string;
  sourceType: 'vital' | 'symptom';
  sourceId: string;
  patientId: string;
  patientName: string;
  summary: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  recordedAt: string;
  heuristicSeverity: 'high' | 'medium' | 'low';
  /** Urgent / warning / info — derived from vitals & symptoms thresholds */
  severityCategory?: 'urgent' | 'warning' | 'info';
  sortScore: number;
}

export interface ClinicalReviewQueueResponseDto {
  items: ClinicalReviewQueueItemDto[];
  sortedBy: 'ai' | 'heuristic';
}

export interface AlertsDataSummaryDto {
  database: string | null;
  counts: Record<string, number>;
  collections: Record<string, string>;
}

export interface AlertDto {
  _id: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName?: string;
  /** Present when alert was sent from clinical review (links to symptom/vital doc). */
  sourceType?: string;
  sourceId?: string;
  type: string;
  severity: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  message: string;
  /** open | seen | reported | acknowledged */
  status: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string | null;
  seenAt?: string | null;
  reportedAt?: string | null;
  createdAt?: string;
}

/** Physician → patient urgent clinic / ED instruction (optionally linked to a vital or symptom row). */
export interface CreateUrgentClinicAlertPayload {
  patientId: string;
  physicianUserId: string;
  severity: string;
  message?: string;
  type?: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  sourceType?: 'symptom' | 'vital' | 'manual';
  sourceId?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  private readonly base = `${API_BASE_URL}/alerts`;

  constructor(private readonly http: HttpClient) {}

  getAlerts(opts?: {
    doctorId?: string;
    patientId?: string;
    limit?: number;
    skip?: number;
  }): Observable<AlertDto[]> {
    let params = new HttpParams();
    if (opts?.doctorId) params = params.set('doctorId', opts.doctorId);
    if (opts?.patientId) params = params.set('patientId', opts.patientId);
    if (opts?.limit != null) params = params.set('limit', String(opts.limit));
    if (opts?.skip != null) params = params.set('skip', String(opts.skip));
    return this.http.get<AlertDto[]>(this.base, { params });
  }

  /** Abnormal vitals/symptoms, urgency-sorted (AI when backend has GROQ_API_KEY). */
  getClinicalReviewQueue(doctorId?: string): Observable<ClinicalReviewQueueResponseDto> {
    let params = new HttpParams();
    if (doctorId) {
      params = params.set('doctorId', doctorId);
    }
    return this.http.get<ClinicalReviewQueueResponseDto>(
      `${this.base}/clinical-review-queue`,
      { params },
    );
  }

  /** Compare with Compass: DB name + document counts per collection. */
  getDataSummary(): Observable<AlertsDataSummaryDto> {
    return this.http.get<AlertsDataSummaryDto>(`${this.base}/data-summary`);
  }

  getOpenCount(opts?: {
    doctorId?: string;
    patientId?: string;
  }): Observable<{ count: number }> {
    let params = new HttpParams();
    if (opts?.doctorId) {
      params = params.set('doctorId', opts.doctorId);
    }
    if (opts?.patientId) {
      params = params.set('patientId', opts.patientId);
    }
    return this.http.get<{ count: number }>(`${this.base}/stats/open-count`, {
      params,
    });
  }

  createUrgentClinicAlert(
    payload: CreateUrgentClinicAlertPayload,
  ): Observable<AlertDto> {
    return this.http.post<AlertDto>(this.base, payload);
  }

  /** Groq when server has GROQ_API_KEY; otherwise template text. */
  suggestDoctorMessage(payload: {
    patientName: string;
    summary: string;
    severityPreset: 'high' | 'medium' | 'low';
    sourceType?: 'vital' | 'symptom';
    parameter?: string;
  }): Observable<{ message: string; source: 'groq' | 'template' }> {
    return this.http.post<{ message: string; source: 'groq' | 'template' }>(
      `${this.base}/doctor/suggest-message`,
      payload,
    );
  }

  acknowledge(
    alertId: string,
    opts?: { nurseUserId?: string; doctorUserId?: string; patientUserId?: string },
  ): Observable<AlertDto> {
    return this.http.patch<AlertDto>(`${this.base}/${alertId}/acknowledge`, {
      nurseUserId: opts?.nurseUserId,
      doctorUserId: opts?.doctorUserId,
      patientUserId: opts?.patientUserId,
    });
  }

  markAsSeen(alertId: string, nurseUserId?: string): Observable<AlertDto> {
    return this.http.patch<AlertDto>(`${this.base}/${alertId}/seen`, { nurseUserId });
  }

  markAsReported(alertId: string, nurseUserId?: string): Observable<AlertDto> {
    return this.http.patch<AlertDto>(`${this.base}/${alertId}/reported`, { nurseUserId });
  }
}
