import { environment } from 'src/environments/environment';
import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

// service.service.ts
@Injectable({
  providedIn: 'root'
})
export class ServiceService {
  private apiUrl = `http://localhost:3000/services`;

  constructor(private http: HttpClient) {}

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}