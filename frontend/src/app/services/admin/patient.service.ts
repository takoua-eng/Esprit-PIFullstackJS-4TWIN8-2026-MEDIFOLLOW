import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Patient {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  nationalId?: string;
  address?: string;
  dateOfBirth?: Date | string;
  age?: number;
  maritalStatus?: string;
  medicalRecordNumber?: string;
  emergencyContact?: string;
  insuranceProvider?: string;
  insuranceNumber?: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class PatientService {

  private apiUrl = `http://localhost:3000/users`;

  constructor(private http: HttpClient) {}

  // ✅ GET PATIENTS
  getPatients(): Observable<Patient[]> {
    return this.http.get<Patient[]>(`${this.apiUrl}/patients`);
  }

  // ✅ GET PATIENT BY ID
  getPatientById(id: string): Observable<Patient> {
    return this.http.get<Patient>(`${this.apiUrl}/patients/${id}`);
  }

  // ✅ CREATE PATIENT
  createPatient(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/patients`, data);
  }

  // ✅ CHECK EMAIL
  checkEmail(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/check-email/${email}`)
      .pipe(map((res: { exists: boolean }) => res.exists));
  }

  // ✅ UPDATE PATIENT
  updatePatient(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/patients/${id}`, data);
  }

  // ✅ ARCHIVE PATIENT (Soft delete)
  archivePatient(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/patients/${id}/archive`, {});
  }

  // ✅ ACTIVATE PATIENT
  activatePatient(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/activate`, {});
  }

  // ✅ DEACTIVATE PATIENT
  deactivatePatient(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/deactivate`, {});
  }
}