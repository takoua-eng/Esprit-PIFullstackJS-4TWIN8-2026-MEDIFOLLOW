import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ServiceService {
  private apiUrl = `http://localhost:3000/services`;;

  constructor(private http: HttpClient) {}

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getActiveServices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/active`);
  }

  getServiceById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createService(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateService(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteService(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  activateService(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateService(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/deactivate`, {});
  }
}
