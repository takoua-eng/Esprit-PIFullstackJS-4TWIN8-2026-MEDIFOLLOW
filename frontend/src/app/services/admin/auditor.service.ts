import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Auditor {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuditorService {
  private apiUrl = '${environment.apiUrl}/users/auditors';

  constructor(private http: HttpClient) {}

  // ✅ GET ALL AUDITORS
  getAuditors(): Observable<Auditor[]> {
    return this.http.get<Auditor[]>(this.apiUrl);
  }

  // ✅ GET AUDITOR BY ID
  getAuditorById(id: string): Observable<Auditor> {
    return this.http.get<Auditor>(`${this.apiUrl}/${id}`);
  }

  // ✅ CREATE AUDITOR
  createAuditor(data: FormData | Partial<Auditor>): Observable<Auditor> {
    return this.http.post<Auditor>(this.apiUrl, data);
  }

  // ✅ UPDATE AUDITOR
  updateAuditor(id: string, data: FormData | Partial<Auditor>): Observable<Auditor> {
    return this.http.put<Auditor>(`${this.apiUrl}/${id}`, data);
  }

  // ✅ ARCHIVE (soft delete)
  archiveAuditor(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/archive`, { isArchived: true });
  }

  // ✅ ACTIVATE
  activateAuditor(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/activate`, { isArchived: false });
  }

  // ✅ DEACTIVATE (optionnel)
  deactivateAuditor(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}/deactivate`, { isActive: false });
  }

  // ✅ CHECK EMAIL EXISTENCE (optionnel, comme doctor)
  checkEmail(email: string): Observable<boolean> {
    return this.http
      .get<{ exists: boolean }>(`${this.apiUrl}/check-email/${email}`)
      .pipe(map(res => res.exists));
  }
}