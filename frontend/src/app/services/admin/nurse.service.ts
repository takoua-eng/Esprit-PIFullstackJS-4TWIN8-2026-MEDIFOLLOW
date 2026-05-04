import { environment } from 'src/environments/environment';
// src/app/services/superadmin/nurse.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Nurse {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender?: string;
  serviceId?: string | any;
  service?: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NurseService {
  private apiUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  // ✅ GET ALL NURSES
  getNurses(): Observable<Nurse[]> {
    return this.http.get<Nurse[]>(`${this.apiUrl}/nurses`);
  }

  // ✅ GET NURSE BY ID
  getNurseById(id: string): Observable<Nurse> {
    return this.http.get<Nurse>(`${this.apiUrl}/nurses/${id}`);
  }

  // ✅ CREATE NURSE
  createNurse(data: FormData): Observable<Nurse> {
    return this.http.post<Nurse>(`${this.apiUrl}/nurses`, data);
  }

  // ✅ UPDATE NURSE
  updateNurse(id: string, data: FormData): Observable<Nurse> {
    return this.http.put<Nurse>(`${this.apiUrl}/nurses/${id}`, data);
  }

  // ✅ ARCHIVE NURSE (Soft delete)
  archiveNurse(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/nurses/${id}/archive`, {});
  }

  // ✅ ACTIVATE NURSE
  activateNurse(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/nurses/${id}/activate`, {});
  }

  // ✅ DEACTIVATE NURSE
  deactivateNurse(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/nurses/${id}/deactivate`, {});
  }

  // ✅ CHECK IF EMAIL EXISTS
  checkEmail(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/check-email/${email}`)
      .pipe(map(res => res.exists));
  }
}