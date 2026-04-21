import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';


export interface PatientContext {
  name?: string;
  latestVitals?: {
    temperature?: number;
    heartRate?: number;
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    weight?: number;
  };
  recentSymptoms?: {
    symptoms?: string[];
    painLevel?: number;
    fatigueLevel?: number;
    description?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AiService {
  private apiUrl = `${API_BASE_URL}/ai`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, patientContext?: PatientContext): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/chat`, { message, patientContext });
  }
}
