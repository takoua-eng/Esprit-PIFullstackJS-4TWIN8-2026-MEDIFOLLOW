import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface PrescriptionDto {
  _id?: string;
  patientId: string;
  doctorId: string;
  medications: Medication[];
  notes?: string;
  signature: string;
  status?: string;
  createdAt?: string;
  patientName?: string; // Populated in some responses
  doctorName?: string; // Populated in some responses
}

@Injectable({ providedIn: 'root' })
export class PrescriptionsApiService {
  private readonly base = `${API_BASE_URL}/prescriptions`;

  constructor(private readonly http: HttpClient) {}

  issue(data: PrescriptionDto): Observable<PrescriptionDto> {
    return this.http.post<PrescriptionDto>(this.base, data);
  }

  getPatientPrescriptions(patientId: string): Observable<PrescriptionDto[]> {
    return this.http.get<PrescriptionDto[]>(`${this.base}/patient/${patientId}`);
  }

  getDoctorPrescriptions(doctorId: string): Observable<PrescriptionDto[]> {
    return this.http.get<PrescriptionDto[]>(`${this.base}/doctor/${doctorId}`);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
