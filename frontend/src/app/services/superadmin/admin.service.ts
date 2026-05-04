import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ✅ Interface Admin avec tous les champs nécessaires
export interface Admin {
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

  // 🏥 Service
  serviceId?: string | any;

  // ✅ System fields - REQUIRED (pas de '?')
  isArchived: boolean; // ✅ Toujours présent
  isActive: boolean; // ✅ Toujours présent

  // Metadata
  role?: any;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private baseUrl = '${environment.apiUrl}/users';

  constructor(private http: HttpClient) {}

  getAdmins(): Observable<Admin[]> {
    return this.http
      .get<Admin[]>(`${this.baseUrl}/admins`)
      .pipe(catchError(this.handleError));
  }

  getAdminById(id: string): Observable<Admin> {
    return this.http
      .get<Admin>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  createAdmin(formData: FormData): Observable<Admin> {
    return this.http
      .post<Admin>(`${this.baseUrl}/admins`, formData)
      .pipe(catchError(this.handleError));
  }

  updateAdmin(id: string, formData: FormData): Observable<Admin> {
    return this.http
      .put<Admin>(`${this.baseUrl}/${id}`, formData)
      .pipe(catchError(this.handleError));
  }

  archiveAdmin(id: string): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  activateAdmin(id: string): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/${id}/activate`, {})
      .pipe(catchError(this.handleError));
  }

  deactivateAdmin(id: string): Observable<any> {
    return this.http
      .put(`${this.baseUrl}/${id}/deactivate`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    console.error('❌ AdminService error:', error);
    return throwError(() => new Error(error.error?.message || 'Server error'));
  }
}
