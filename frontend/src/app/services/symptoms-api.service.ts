import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface SymptomDto {
  _id: string;
  patientId: string;
  patientName: string;
  reportedBy: string;
  reporterName: string;
  entrySource: string;
  symptoms: string[];
  painLevel?: number;
  description?: string;
  reportedAt: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SymptomsApiService {
  private readonly base = `${API_BASE_URL}/symptoms`;

  constructor(private readonly http: HttpClient) {}

  getSymptoms(patientId?: string): Observable<SymptomDto[]> {
    const q = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
    return this.http.get<SymptomDto[]>(`${this.base}${q}`);
  }

  create(body: {
    patientId: string;
    reportedBy: string;
    entrySource: 'nurse_assisted';
    symptoms?: string[];
    painLevel?: number;
    description?: string;
  }): Observable<SymptomDto> {
    return this.http.post<SymptomDto>(this.base, body);
  }

  verify(symptomId: string, nurseUserId: string): Observable<SymptomDto> {
    return this.http.patch<SymptomDto>(`${this.base}/${symptomId}/verify`, {
      nurseUserId,
    });
  }
}
