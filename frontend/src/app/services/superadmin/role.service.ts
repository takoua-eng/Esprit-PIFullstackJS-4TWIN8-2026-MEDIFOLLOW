import { environment } from '../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isActive?: boolean;
  isArchived?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  private api = '${environment.apiUrl}/roles';

  constructor(private http: HttpClient) {}

  getRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.api);
  }

  createRole(data: any): Observable<Role> {
    return this.http.post<Role>(this.api, data);
  }

  updateRole(id: string, data: any): Observable<Role> {
    return this.http.put<Role>(`${this.api}/${id}`, data);
  }

  archiveRole(id: string) {
    return this.http.put(`${this.api}/${id}/archive`, {});
  }

  deleteRole(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  getUsersCountByRole(): Observable<any> {
    return this.http.get<any>('${environment.apiUrl}/users/stats/roles-count');
  }

  getPermissions(): Observable<string[]> {
    return this.http.get<string[]>('${environment.apiUrl}/roles/permissions');
  }
}
