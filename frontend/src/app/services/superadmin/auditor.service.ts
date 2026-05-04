import { environment } from 'src/environments/environment';
// src/app/services/superadmin/auditor.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ✅ Interface Auditor avec isArchived et isActive comme REQUIRED
export interface Auditor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;

  // Champs personnels
  address?: string;
  nationalId?: string;
  gender?: string;
  phone?: string;
  photo?: string;

  // ✅ System fields - REQUIRED (pas de '?')
  isArchived: boolean;    // ✅ Toujours présent
  isActive: boolean;      // ✅ Toujours présent

  // Metadata
  role?: any;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditorService {
  private baseUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  getAuditors(): Observable<Auditor[]> {
    return this.http.get<Auditor[]>(`${this.baseUrl}/auditors`).pipe(
      catchError(this.handleError)
    );
  }

  getAuditorById(id: string): Observable<Auditor> {
    return this.http.get<Auditor>(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  createAuditor(formData: FormData): Observable<Auditor> {
    return this.http.post<Auditor>(`${this.baseUrl}/auditors`, formData).pipe(
      catchError(this.handleError)
    );
  }

  updateAuditor(id: string, formData: FormData): Observable<Auditor> {
    return this.http.put<Auditor>(`${this.baseUrl}/${id}`, formData).pipe(
      catchError(this.handleError)
    );
  }

  archiveAuditor(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  activateAuditor(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/activate`, {}).pipe(
      catchError(this.handleError)
    );
  }

  deactivateAuditor(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/deactivate`, {}).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ AuditorService error:', error);
    return throwError(() => new Error(error.error?.message || 'Server error'));
  }
}
