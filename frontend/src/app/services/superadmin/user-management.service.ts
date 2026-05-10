import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  address?: string;
  photo?: string;
  isActive: boolean;
  isArchived: boolean;
  role?: any;
  serviceId?: any;
  nationalId?: string;
  maritalStatus?: string;
  // patient
  dateOfBirth?: string;
  medicalRecordNumber?: string;
  emergencyContact?: string;
  // doctor
  specialization?: string;
  // nurse / coordinator
  department?: string;
  shift?: string;
  assignedService?: string;
}

const BASE = `${environment.apiUrl}/users`;

// Map role name → create endpoint
const CREATE_ENDPOINTS: Record<string, string> = {
  patient:     `${BASE}/patients`,
  doctor:      `${BASE}/doctors`,
  nurse:       `${BASE}/nurses`,
  coordinator: `${BASE}/coordinators`,
  auditor:     `${BASE}/auditors`,
  admin:       `${BASE}/admins`,
};

// Map role name → list endpoint
const LIST_ENDPOINTS: Record<string, string> = {
  patient:     `${BASE}/patients`,
  doctor:      `${BASE}/doctors`,
  nurse:       `${BASE}/nurses`,
  coordinator: `${BASE}/coordinators`,
  auditor:     `${BASE}/auditors`,
  admin:       `${BASE}/admins`,
};

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  constructor(private http: HttpClient) {}

  getByRole(role: string): Observable<UserRow[]> {
    const url = LIST_ENDPOINTS[role.toLowerCase()] ?? BASE;
    return this.http.get<UserRow[]>(url);
  }

  getAllUsers(): Observable<UserRow[]> {
    return this.http.get<UserRow[]>(BASE);
  }

  /**
   * Create a user — maps role name to the correct backend endpoint.
   * Unknown roles fall back to the generic /users endpoint.
   */
  create(role: string, formData: FormData): Observable<any> {
    const url = CREATE_ENDPOINTS[role.toLowerCase()] ?? BASE;
    return this.http.post(url, formData);
  }

  update(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${BASE}/${id}`, formData);
  }

  archive(id: string): Observable<any> {
    return this.http.delete(`${BASE}/${id}`);
  }

  restore(id: string): Observable<any> {
    return this.http.put(`${BASE}/${id}/restore`, {});
  }

  activate(id: string): Observable<any> {
    return this.http.put(`${BASE}/${id}/activate`, {});
  }

  deactivate(id: string): Observable<any> {
    return this.http.put(`${BASE}/${id}/deactivate`, {});
  }

  getUser(id: string): Observable<UserRow> {
    return this.http.get<UserRow>(`${BASE}/${id}`);
  }
}
