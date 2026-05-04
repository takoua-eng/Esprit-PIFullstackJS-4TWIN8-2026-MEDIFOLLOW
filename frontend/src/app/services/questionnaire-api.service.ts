import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

@Injectable({ providedIn: 'root' })
export class QuestionnaireApiService {
  private readonly base = `${API_BASE_URL}/questionnaire-responses`;

  constructor(private readonly http: HttpClient) {}

  /** Whether the patient submitted any questionnaire today (backend boolean body). */
  hasRespondedToday(patientId: string): Observable<boolean> {
    return this.http.get<boolean>(
      `${this.base}/patient/${encodeURIComponent(patientId)}/today`,
    );
  }

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/questionnaire-templates`);
  }

  createInstance(dto: {
    templateId: string;
    patientId: string;
    doctorId: string;
    extraQuestions?: any[];
  }): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/questionnaire-instances`, dto);
  }

  getInstancesByDoctor(doctorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${API_BASE_URL}/questionnaire-instances/doctor/${encodeURIComponent(doctorId)}`);
  }

  getInstance(id: string): Observable<any> {
    return this.http.get<any>(`${API_BASE_URL}/questionnaire-instances/${encodeURIComponent(id)}`);
  }

  getResponsesByPatient(patientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/patient/${encodeURIComponent(patientId)}`);
  }

  updateReview(
    id: string,
    doctorId: string,
    review: { reviewedByDoctor: boolean; doctorNotes?: string }
  ): Observable<any> {
    return this.http.put<any>(
      `${this.base}/${encodeURIComponent(id)}/review?doctorId=${encodeURIComponent(doctorId)}`,
      review
    );
  }
}
