import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

  getVitals(patientId?: string): Observable<VitalDto[]> {
    const q = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return this.http.get<VitalDto[]>(`${this.base}${q}`);
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
