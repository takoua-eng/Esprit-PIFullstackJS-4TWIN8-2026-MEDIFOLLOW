import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
export interface Doctor {
  _id: string;

  firstName: string;
  lastName: string;
  email: string;

  phone?: string;
  gender?: string;

  specialization?: string;
  licenseNumber?: string;

  photo?: string;

  isActive?: boolean;
  isArchived?: boolean;

  serviceId?: any;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {

  private apiUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  // ✅ GET DOCTORS
  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  }

  // ✅ CREATE DOCTOR
  createDoctor(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/doctors`, data);
  }


  // doctor.service.ts
  // Vérifie si un email existe déjà
  checkEmail(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/check-email/${email}`)
      .pipe(map((res: { exists: boolean }) => res.exists));
  }

  // ✅ UPDATE DOCTOR
    updateDoctor(id: string, data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/doctors/${id}`, data);
  }

  // doctor.service.ts
getDoctorById(id: string): Observable<Doctor> {
  return this.http.get<Doctor>(`${this.apiUrl}/doctors/${id}`);
}

  // ✅ ARCHIVE DOCTOR (Soft delete)
archiveDoctor(id: string): Observable<any> {
  return this.http.put(`${this.apiUrl}/doctors/${id}/archive`, {});
}

  // ✅ ACTIVATE DOCTOR
  activateDoctor(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/activate`, {});
  }

  // ✅ DEACTIVATE DOCTOR
  deactivateDoctor(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/deactivate`, {});
  }

}