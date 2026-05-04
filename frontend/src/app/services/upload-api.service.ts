import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export type UploadResult = {
  path: string;
  filename: string;
};

@Injectable({ providedIn: 'root' })
export class UploadApiService {
  private readonly base = `${API_BASE_URL}/upload`;

  constructor(private readonly http: HttpClient) {}

  upload(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>(this.base, form);
  }
}
