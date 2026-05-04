import { environment } from "src/environments/environment";
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export type HospitalizationHandwritingResult = {
  admissionDate: string;
  dischargeDate: string;
  dischargeUnit: string;
  primaryDiagnosis: string;
  hospitalizationReason: string;
  secondaryDiagnoses: string;
  proceduresPerformed: string;
  dischargeSummaryNotes: string;
  source: 'groq';
};

@Injectable({ providedIn: 'root' })
export class HospitalizationHandwritingApiService {
  private readonly base = `${API_BASE_URL}/hospitalization-handwriting`;

  constructor(private readonly http: HttpClient) {}

  parseImage(file: File): Observable<HospitalizationHandwritingResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<HospitalizationHandwritingResult>(
      `${this.base}/parse`,
      form,
    );
  }
}
