import { environment } from 'src/environments/environment';
// src/app/services/superadmin/nurse.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Nurse {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  nationalId?: string;
  gender?: string;
  photo?: string;
  serviceId?: string | any;
  role?: any;
  shift?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class NurseService {
  private baseUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  getNurses(): Observable<Nurse[]> {
    return this.http.get<Nurse[]>(`${this.baseUrl}/nurses`);
  }

  createNurse(formData: FormData): Observable<Nurse> {
    return this.http.post<Nurse>(`${this.baseUrl}/nurses`, formData);
  }

  updateNurse(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, formData);
  }

  archiveNurse(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  getNurseById(id: string): Observable<Nurse> {
    return this.http.get<Nurse>(`${this.baseUrl}/${id}`);
  }

  // ✅ ACTIVATE NURSE
  activateNurse(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/activate`, {});
  }

  // ✅ DEACTIVATE NURSE
  deactivateNurse(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/deactivate`, {});
  }
}
