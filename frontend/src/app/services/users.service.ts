import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private api = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  getProfile(): Observable<any> {
    return this.http.get(`${this.api}/me`);
  }

  updateUser(id: string, dto: any): Observable<any> {
    return this.http.put(`${this.api}/${id}`, dto);
  }
}