import { environment } from '../environments/environment';
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

// service.service.ts
@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = '${environment.apiUrl}/services';

  constructor(private http: HttpClient) {}

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}