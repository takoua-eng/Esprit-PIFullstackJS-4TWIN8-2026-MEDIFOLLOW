import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../core/api.config';

export interface VideoCallInviteDto {
  _id: string;
  roomName: string;
  physicianUserId: string;
  physicianName: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class VideoCallsApiService {
  private readonly base = `${API_BASE_URL}/video-calls`;

  constructor(private readonly http: HttpClient) {}

  invite(payload: {
    patientId: string;
    physicianUserId: string;
  }): Observable<VideoCallInviteDto> {
    return this.http.post<VideoCallInviteDto>(`${this.base}/invite`, payload);
  }

  /** Backend returns `{ invite: dto | null }` so the response is always valid JSON. */
  getPending(patientId: string): Observable<VideoCallInviteDto | null> {
    return this.http
      .get<{ invite: VideoCallInviteDto | null }>(`${this.base}/pending`, {
        params: { patientId },
      })
      .pipe(map((r) => r?.invite ?? null));
  }

  dismiss(inviteId: string, patientId: string): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(
      `${this.base}/${inviteId}/dismiss`,
      { patientId },
    );
  }
}
