import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

/** Raw row from `GET /vital-parameters` (patient vitals collection). */
export type VitalParametersRaw = {
  _id: string;
  patientId:
    | string
    | { _id?: string; firstName?: string; lastName?: string };
  recordedBy?: string | { _id?: string };
  temperature?: number;
  bloodPressure?: string;
  bloodPressureSystolic?: number;
  bloodPressuresystolic?: number;
  bloodPressureDiastolic?: number;
  weight?: number;
  heartRate?: number;
  notes?: string;
  recordedAt: string;
};

@Injectable({ providedIn: 'root' })
export class VitalParametersApiService {
  private readonly base = `${API_BASE_URL}/vital-parameters`;

  constructor(private readonly http: HttpClient) {}

  /** All rows from `vitalparameters` (patient-entered vitals). */
  getAll(): Observable<VitalParametersRaw[]> {
    return this.http.get<VitalParametersRaw[]>(this.base);
  }
}
