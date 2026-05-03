﻿import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AlertDto,
  AlertsApiService,
  ClinicalReviewQueueItemDto,
} from 'src/app/services/alerts-api.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import {
  DoctorSendAlertDialogComponent,
  DoctorSendAlertDialogData,
} from './doctor-send-alert-dialog.component';
import {
  PatientMedicalFileDialogComponent,
  PatientMedicalFileDialogData,
} from './patient-medical-file-dialog.component';
import { buildJitsiMeetUrl } from 'src/app/core/api.config';
import { VideoCallsApiService } from 'src/app/services/video-calls-api.service';

@Component({
  selector: 'app-doctor-alerts',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './doctor-alerts.component.html',
  styleUrls: ['./doctor-alerts.component.scss'],
})
export class DoctorAlertsComponent implements OnInit {
  loading = true;
  queueLoading = true;
  error: string | null = null;
  queueError: string | null = null;
  alerts: AlertDto[] = [];
  reviewQueue: ClinicalReviewQueueItemDto[] = [];
  queueSortedBy: 'ai' | 'heuristic' | null = null;
  // â”€â”€ Clinical Review Queue filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  queueTypeFilter = 'all';
  queueUrgencyFilter = 'all';
  queueSearchText = '';
  queuePageIndex = 0;
  queuePageSize = 10;
  readonly queuePageSizeOptions = [5, 10, 25];

  // â”€â”€ Issued Alerts filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  filter: 'all' | 'open' = 'open';
  severityFilter = 'all';
  typeFilter = 'all';
  searchText = '';
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 25, 50];

  activePhysicianId: string | null = null;
  /** No Mongo user id in JWT â€” cannot scope alerts */
  noDoctorSession = false;
  sending = false;

  displayedColumns: string[] = [
    'createdAt',
    'patientName',
    'parameter',
    'severity',
    'message',
    'status',
  ];

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly videoCallsApi: VideoCallsApiService,
    private readonly usersApi: UsersApiService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  /** MongoDB user id from JWT `sub` (same as logged-in doctor). */
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

  load(): void {
    this.loading = true;
    this.queueLoading = true;
    this.error = null;
    this.queueError = null;
    this.noDoctorSession = false;

    const doctorId = this.userIdFromAccessToken();
    if (doctorId) {
      this.activePhysicianId = doctorId;
      this.fetchAlertsForDoctor(doctorId);
      return;
    }

    this.usersApi.getPhysicians().subscribe({
      next: (rows) => {
        this.activePhysicianId = rows[0]?._id ?? null;
        if (!this.activePhysicianId) {
          this.noDoctorSession = true;
          this.alerts = [];
          this.reviewQueue = [];
          this.loading = false;
          this.queueLoading = false;
          return;
        }
        this.fetchAlertsForDoctor(this.activePhysicianId);
      },
      error: (err) => {
        console.error('Failed to resolve physician', err);
        const status = err?.status
          ? `HTTP ${err.status}`
          : 'Network/API error';
        this.error = status;
        this.loading = false;
        this.queueLoading = false;
      },
    });
  }

  private fetchAlertsForDoctor(doctorId: string): void {
    this.alertsApi.getAlerts({ doctorId }).subscribe({
      next: (list) => {
        this.alerts = list;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load doctor alerts', err);
        const status = err?.status ? `HTTP ${err.status}` : 'Network/API error';
        this.error = status;
        this.loading = false;
      },
    });

    this.alertsApi.getClinicalReviewQueue(doctorId).subscribe({
      next: (res) => {
        this.reviewQueue = res.items;
        this.queueSortedBy = res.sortedBy;
        this.queueLoading = false;
      },
      error: (err) => {
        console.error('Failed to load clinical review queue', err);
        const status = err?.status ? `HTTP ${err.status}` : 'Network/API error';
        this.queueError = status;
        this.queueLoading = false;
      },
    });
  }

  /** Reload only issued alerts â€” keeps clinical review visible (no full-page queue spinner). */
  private refreshIssuedAlertsOnly(doctorId: string): void {
    this.alertsApi.getAlerts({ doctorId }).subscribe({
      next: (list) => {
        this.alerts = list;
      },
      error: (err) => {
        console.error('Failed to refresh issued alerts', err);
      },
    });
  }

  /** Soft-refresh clinical queue without hiding the table (e.g. after data might change). */
  private refreshClinicalQueueQuiet(doctorId: string): void {
    this.alertsApi.getClinicalReviewQueue(doctorId).subscribe({
      next: (res) => {
        this.reviewQueue = res.items;
        this.queueSortedBy = res.sortedBy;
        this.queueError = null;
      },
      error: (err) => {
        console.error('Failed to refresh clinical review queue', err);
      },
    });
  }

  // â”€â”€ Clinical Review Queue helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  get filteredQueue(): ClinicalReviewQueueItemDto[] {
    let list = this.reviewQueue;
    if (this.queueTypeFilter !== 'all') {
      list = list.filter((r) => r.sourceType === this.queueTypeFilter);
    }
    if (this.queueUrgencyFilter !== 'all') {
      list = list.filter((r) => r.severityCategory === this.queueUrgencyFilter);
    }
    if (this.queueSearchText.trim()) {
      const q = this.queueSearchText.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.patientName || '').toLowerCase().includes(q) ||
          (r.summary || '').toLowerCase().includes(q) ||
          (r.parameter || '').toLowerCase().includes(q),
      );
    }
    return list;
  }

  get totalQueueCount(): number {
    return this.filteredQueue.length;
  }

  get paginatedQueue(): ClinicalReviewQueueItemDto[] {
    const start = this.queuePageIndex * this.queuePageSize;
    return this.filteredQueue.slice(start, start + this.queuePageSize);
  }

  onQueueFilterChange(): void {
    this.queuePageIndex = 0;
  }

  onQueuePageChange(event: { pageIndex: number; pageSize: number }): void {
    this.queuePageIndex = event.pageIndex;
    this.queuePageSize = event.pageSize;
  }

  clearQueueFilters(): void {
    this.queueTypeFilter = 'all';
    this.queueUrgencyFilter = 'all';
    this.queueSearchText = '';
    this.queuePageIndex = 0;
  }

  get hasActiveQueueFilters(): boolean {
    return (
      this.queueTypeFilter !== 'all' ||
      this.queueUrgencyFilter !== 'all' ||
      this.queueSearchText.trim() !== ''
    );
  }

  // â”€â”€ Issued Alerts helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  get filteredAlerts(): AlertDto[] {
    let list = this.alerts;

    if (this.filter === 'open') {
      list = list.filter((a) => a.status === 'open');
    }
    if (this.severityFilter !== 'all') {
      list = list.filter(
        (a) => (a.severity || '').toLowerCase() === this.severityFilter,
      );
    }
    if (this.typeFilter !== 'all') {
      list = list.filter((a) => a.type === this.typeFilter);
    }
    if (this.searchText.trim()) {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.patientName || '').toLowerCase().includes(q) ||
          (a.message || '').toLowerCase().includes(q) ||
          (a.parameter || '').toLowerCase().includes(q),
      );
    }
    return list;
  }

  get totalFilteredCount(): number {
    return this.filteredAlerts.length;
  }

  get paginatedAlerts(): AlertDto[] {
    const start = this.pageIndex * this.pageSize;
    return this.filteredAlerts.slice(start, start + this.pageSize);
  }

  onFilterChange(): void {
    this.pageIndex = 0;
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  clearFilters(): void {
    this.filter = 'open';
    this.severityFilter = 'all';
    this.typeFilter = 'all';
    this.searchText = '';
    this.pageIndex = 0;
  }

  get hasActiveFilters(): boolean {
    return (
      this.filter !== 'open' ||
      this.severityFilter !== 'all' ||
      this.typeFilter !== 'all' ||
      this.searchText.trim() !== ''
    );
  }

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'sev-high';
    if (s === 'medium' || s === 'warning') return 'sev-medium';
    return 'sev-low';
  }

  issuedStatusLabel(status: string): string {
    switch (status) {
      case 'seen':         return 'Seen';
      case 'reported':     return 'Reported';
      case 'acknowledged': return 'Confirmed';
      default:             return 'Pending';
    }
  }

  issuedStatusClass(status: string): string {
    switch (status) {
      case 'seen':         return 'status-seen';
      case 'reported':     return 'status-reported';
      case 'acknowledged': return 'status-done';
      default:             return 'status-open';
    }
  }

  queueSeverityClass(row: ClinicalReviewQueueItemDto): string {
    const c = row.severityCategory;
    if (c === 'urgent') return 'sev-high';
    if (c === 'warning') return 'sev-medium';
    if (c === 'info') return 'sev-low';
    return this.severityClass(row.heuristicSeverity);
  }

  severityLabel(row: ClinicalReviewQueueItemDto): string {
    if (row.severityCategory === 'urgent') {
      return this.translate.instant('DOCTOR_SEVERITY_URGENT');
    }
    if (row.severityCategory === 'warning') {
      return this.translate.instant('DOCTOR_SEVERITY_WARNING');
    }
    if (row.severityCategory === 'info') {
      return this.translate.instant('DOCTOR_SEVERITY_INFO');
    }
    return row.heuristicSeverity;
  }

  /**
   * Opens a browser video room (default: Jitsi Meet) in a new tab.
   * Room name is stable per patient + doctor so you can share it with the patient for the same call.
   */
  openVideoCall(row: ClinicalReviewQueueItemDto): void {
    if (!this.activePhysicianId) return;
    this.videoCallsApi
      .invite({
        patientId: row.patientId,
        physicianUserId: this.activePhysicianId,
      })
      .subscribe({
        next: () => {
          this.snackBar.open(
            this.translate.instant('DOCTOR_VIDEO_CALL_NOTIFY_OK'),
            undefined,
            { duration: 3000 },
          );
          const room = `EspritCare-${row.patientId}-${this.activePhysicianId}`;
          window.open(buildJitsiMeetUrl(room), '_blank', 'noopener,noreferrer');
        },
        error: (err) => {
          console.error('Video call invite failed', err);
          this.snackBar.open(
            this.translate.instant('DOCTOR_VIDEO_CALL_NOTIFY_FAIL'),
            undefined,
            { duration: 5000 },
          );
        },
      });
  }

  openMedicalFile(row: ClinicalReviewQueueItemDto): void {
    const data: PatientMedicalFileDialogData = {
      patientId: row.patientId,
      patientName: row.patientName,
    };
    this.dialog.open(PatientMedicalFileDialogComponent, {
      data,
      width: '780px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      autoFocus: false,
    });
  }

  openSendAlert(
    row: ClinicalReviewQueueItemDto,
    preset: 'high' | 'medium' | 'low',
  ): void {
    if (!this.activePhysicianId || this.sending) return;

    const severityLabels: Record<string, string> = {
      high: this.translate.instant('DOCTOR_ALERT_SEV_HIGH'),
      medium: this.translate.instant('DOCTOR_ALERT_SEV_MEDIUM'),
      low: this.translate.instant('DOCTOR_ALERT_SEV_LOW'),
    };

    const typeLabel =
      row.sourceType === 'vital'
        ? this.translate.instant('DOCTOR_ALERT_TYPE_VITAL')
        : this.translate.instant('DOCTOR_ALERT_TYPE_SYMPTOM');

    const data: DoctorSendAlertDialogData = {
      patientName: row.patientName,
      sourceLabel: `${typeLabel}: ${row.summary}`,
      defaultSeverityLabel: severityLabels[preset] ?? preset,
      severityPreset: preset,
      summary: row.summary,
      sourceType: row.sourceType,
      parameter: row.parameter,
    };

    const ref = this.dialog.open(DoctorSendAlertDialogComponent, {
      data,
      width: '520px',
      autoFocus: 'textarea',
    });

    ref.afterClosed().subscribe((result) => {
      if (!result?.message?.trim()) return;
      this.sending = true;
      this.alertsApi
        .createUrgentClinicAlert({
          patientId: row.patientId,
          physicianUserId: this.activePhysicianId!,
          severity: preset,
          message: result.message.trim(),
          sourceType: row.sourceType,
          sourceId: row.sourceId,
          parameter: row.parameter,
          value: row.value,
          threshold: row.threshold,
          type: 'physician_instruction',
        })
        .subscribe({
          next: () => {
            this.sending = false;
            this.snackBar.open(
              this.translate.instant('DOCTOR_ALERT_SENT_OK'),
              undefined,
              { duration: 3500 },
            );
            // Issued alert is new; clinical review is still driven by vitals/symptoms â€” do not
            // run full load() (that clears the queue UI with queueLoading). Refresh lists separately.
            if (this.activePhysicianId) {
              this.refreshIssuedAlertsOnly(this.activePhysicianId);
              this.refreshClinicalQueueQuiet(this.activePhysicianId);
            }
          },
          error: (err) => {
            this.sending = false;
            console.error(err);
            this.snackBar.open(
              this.translate.instant('DOCTOR_ALERT_SENT_FAIL'),
              undefined,
              { duration: 5000 },
            );
          },
        });
    });
  }
}
