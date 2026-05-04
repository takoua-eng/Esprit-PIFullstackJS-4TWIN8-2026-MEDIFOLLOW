import { environment } from 'src/environments/environment';
import { Injectable, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { filter, Subscription } from 'rxjs';
import { normalizeRoleKey } from './post-login-route';
import {
  PatientVideoCallDialogComponent,
  PatientVideoCallDialogResult,
} from './patient-video-call-dialog.component';
import { VideoCallsApiService } from '../services/video-calls-api.service';

/** How often to ask the API for a pending invite while the patient is in the portal. */
const POLL_MS = 5_000;

/**
 * While the patient is in `/dashboard/patient/*`, polls for a video-call invite
 * and opens a dialog popup when the doctor has started a call.
 */
@Injectable({ providedIn: 'root' })
export class PatientVideoCallNotifierService implements OnDestroy {
  private routerSub = Subscription.EMPTY;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private dialogRef: MatDialogRef<
    PatientVideoCallDialogComponent,
    PatientVideoCallDialogResult
  > | null = null;

  constructor(
    private readonly router: Router,
    private readonly videoCallsApi: VideoCallsApiService,
    private readonly dialog: MatDialog,
  ) {
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncPolling());
    setTimeout(() => this.syncPolling(), 0);
  }

  ngOnDestroy(): void {
    this.routerSub.unsubscribe();
    this.clearPoll();
  }

  private syncPolling(): void {
    this.clearPoll();
    if (!this.isPatientPortal() || !this.userIdFromAccessToken()) {
      return;
    }
    this.pollTimer = setInterval(() => this.check(), POLL_MS);
    queueMicrotask(() => this.check());
  }

  private clearPoll(): void {
    if (this.pollTimer != null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private isPatientPortal(): boolean {
    const role = normalizeRoleKey(
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('user_role')
        : null,
    );
    if (role !== 'patient') return false;
    return this.router.url.includes('/dashboard/patient');
  }

  private userIdFromAccessToken(): string | null {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private check(): void {
    if (this.dialogRef) return;
    const patientId = this.userIdFromAccessToken();
    if (!patientId || !this.isPatientPortal()) return;

    this.videoCallsApi.getPending(patientId).subscribe({
      next: (invite) => {
        if (!invite || this.dialogRef) return;
        this.dialogRef = this.dialog.open(PatientVideoCallDialogComponent, {
          data: invite,
          width: '420px',
          disableClose: false,
          autoFocus: true,
        });
        this.dialogRef.afterClosed().subscribe(() => {
          this.dialogRef = null;
          this.videoCallsApi.dismiss(invite._id, patientId).subscribe({
            error: (err) => console.warn('Video call dismiss failed', err),
          });
        });
      },
      error: () => {
        /* offline — skip */
      },
    });
  }
}
