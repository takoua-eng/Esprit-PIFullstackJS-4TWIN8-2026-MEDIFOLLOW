import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AdminUser {
  name: string;
  email: string;
  role: string;
  service: string;
  status: 'Active' | 'Inactive';
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin/users`; // adapte selon ton backend

  constructor(private http: HttpClient) {}

  getAdmins(): Observable<AdminUser[]> {
    return this.http.get<AdminUser[]>(this.apiUrl);
  }
}
