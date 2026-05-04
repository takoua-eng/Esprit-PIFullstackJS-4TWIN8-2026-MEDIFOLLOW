import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Doctor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialty?: string;
  serviceId?: string | { _id: string; name: string };
  isArchived?: boolean;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DoctorService {
  private apiUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  getDoctors(): Observable<Doctor[]> {
    return this.http.get<Doctor[]>(`${this.apiUrl}/doctors`);
  }

  createDoctor(doctor: Partial<Doctor>): Observable<Doctor> {
    return this.http.post<Doctor>(this.apiUrl, doctor);
  }

  // ✅ ARCHIVE DOCTOR (Soft Delete)
  archiveDoctor(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
    // 💡 Si votre API utilise PATCH:
    // return this.http.patch(`${this.apiUrl}/${id}`, { isArchived: true });
  }
}
