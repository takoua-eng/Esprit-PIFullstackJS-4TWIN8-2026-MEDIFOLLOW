import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Coordinator {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CoordinateurService {
  private apiUrl = `${environment.apiUrl}/users/coordinators`;

  constructor(private http: HttpClient) {}

  // 🔹 GET all coordinators
getCoordinators(): Observable<Coordinator[]> {
  return this.http.get<Coordinator[]>(`${environment.apiUrl}/users/coordinators`);
}

  // 🔹 GET one coordinator by ID
  getCoordinatorById(id: string): Observable<Coordinator> {
    return this.http.get<Coordinator>(`${this.apiUrl}/${id}`);
  }

  // 🔹 CREATE coordinator
  createCoordinator(formData: FormData): Observable<Coordinator> {
    return this.http.post<Coordinator>(this.apiUrl, formData);
  }

  // 🔹 UPDATE coordinator
  updateCoordinator(id: string, formData: FormData | any): Observable<Coordinator> {
    return this.http.put<Coordinator>(`${this.apiUrl}/${id}`, formData);
  }

  // 🔹 ARCHIVE coordinator
  archiveCoordinator(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/archive`, {});
  }

  // 🔹 ACTIVATE coordinator
  activateCoordinator(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/activate`, {});
  }

  // 🔹 DEACTIVATE coordinator
  deactivateCoordinator(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/deactivate`, {});
  }

  // 🔹 CHECK EMAIL existence
checkEmail(email: string): Observable<{ exists: boolean }> {
  return this.http.get<{ exists: boolean }>(`${this.apiUrl}/check-email/${email}`);
}
}