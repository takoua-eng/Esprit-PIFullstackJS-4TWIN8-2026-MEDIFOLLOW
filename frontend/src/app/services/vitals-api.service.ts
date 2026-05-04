import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface VitalDto {
  _id: string;
  patientId: string;
  patientName: string;
  recordedBy: string;
  recorderName: string;
  entrySource: string;
  temperature?: number;
  bloodPressure?: string;
  weight?: number;
  heartRate?: number;
  notes?: string;
  recordedAt: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class VitalsApiService {
  private readonly base = `${API_BASE_URL}/vitals`;

  constructor(private readonly http: HttpClient) {}

  getVitals(patientId?: string, opts?: { limit?: number; skip?: number }): Observable<VitalDto[]> {
    let params = new HttpParams();
    if (patientId) params = params.set('patientId', patientId);
    if (opts?.limit != null) params = params.set('limit', String(opts.limit));
    if (opts?.skip != null) params = params.set('skip', String(opts.skip));
    return this.http.get<VitalDto[]>(this.base, { params });
  }

  create(body: {
    patientId: string;
    recordedBy: string;
    entrySource: 'nurse_assisted';
    temperature?: number;
    bloodPressure?: string;
    weight?: number;
    heartRate?: number;
    notes?: string;
  }): Observable<VitalDto> {
    return this.http.post<VitalDto>(this.base, body);
  }

  verify(vitalId: string, nurseUserId: string): Observable<VitalDto> {
    return this.http.patch<VitalDto>(`${this.base}/${vitalId}/verify`, {
      nurseUserId,
    });
  }
}
