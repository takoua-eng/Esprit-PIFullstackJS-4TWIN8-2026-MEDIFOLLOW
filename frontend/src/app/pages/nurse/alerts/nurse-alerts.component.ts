import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AlertDto, AlertsApiService } from 'src/app/services/alerts-api.service';
import { UserListRow, UsersApiService } from 'src/app/services/users-api.service';

@Component({
  selector: 'app-nurse-alerts',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './nurse-alerts.component.html',
  styleUrls: ['./nurse-alerts.component.scss'],
})
export class NurseAlertsComponent implements OnInit {
  loading = true;
  error: string | null = null;
  alerts: AlertDto[] = [];
  filter: 'all' | 'open' = 'all';
  patients: UserListRow[] = [];
  selectedPatientId = '';

  /** IDs of alerts currently being updated (prevents double-click). */
  actioning = new Set<string>();

  displayedColumns: string[] = [
    'createdAt',
    'patientName',
    'parameter',
    'severity',
    'message',
    'status',
    'actions',
  ];

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly usersApi: UsersApiService,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.usersApi.getPatients().subscribe({
      next: (rows) => (this.patients = rows),
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.alertsApi
      .getAlerts({ patientId: this.selectedPatientId || undefined })
      .subscribe({
        next: (rows) => {
          this.alerts = rows;
          this.loading = false;
        },
        error: (err) => {
          const status = err?.status ? `HTTP ${err.status}` : 'Network/API error';
          this.error = status;
          this.loading = false;
        },
      });
  }

  get filteredAlerts(): AlertDto[] {
    if (this.filter === 'open') {
      return this.alerts.filter((a) => a.status === 'open');
    }
    return this.alerts;
  }

  // ── Actions ──────────────────────────────────────────────────────────

  private nurseIdFromToken(): string | undefined {
    const token = localStorage.getItem('accessToken');
    if (!token) return undefined;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
      return payload.sub ?? undefined;
    } catch {
      return undefined;
    }
  }

  markAsSeen(alert: AlertDto): void {
    if (this.actioning.has(alert._id)) return;
    this.actioning.add(alert._id);
    this.alertsApi.markAsSeen(alert._id, this.nurseIdFromToken()).subscribe({
      next: (updated) => {
        this.updateLocal(updated);
        this.actioning.delete(alert._id);
        this.snackBar.open('Alert marked as seen', undefined, { duration: 2500 });
      },
      error: () => {
        this.actioning.delete(alert._id);
        this.snackBar.open('Failed to update alert', undefined, { duration: 3000 });
      },
    });
  }

  markAsReported(alert: AlertDto): void {
    if (this.actioning.has(alert._id)) return;
    this.actioning.add(alert._id);
    this.alertsApi.markAsReported(alert._id, this.nurseIdFromToken()).subscribe({
      next: (updated) => {
        this.updateLocal(updated);
        this.actioning.delete(alert._id);
        this.snackBar.open('Alert marked as reported', undefined, { duration: 2500 });
      },
      error: () => {
        this.actioning.delete(alert._id);
        this.snackBar.open('Failed to update alert', undefined, { duration: 3000 });
      },
    });
  }

  private updateLocal(updated: AlertDto): void {
    const idx = this.alerts.findIndex((a) => a._id === updated._id);
    if (idx !== -1) this.alerts[idx] = updated;
    // Force reference change so the table re-renders
    this.alerts = [...this.alerts];
  }

  // ── Display helpers ───────────────────────────────────────────────────

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'sev-high';
    if (s === 'medium' || s === 'warning') return 'sev-medium';
    return 'sev-low';
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'seen':     return 'Seen';
      case 'reported': return 'Reported';
      case 'acknowledged': return 'Acknowledged';
      default:         return 'Open';
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'seen':         return 'status-seen';
      case 'reported':     return 'status-reported';
      case 'acknowledged': return 'status-done';
      default:             return 'status-open';
    }
  }

  isActionable(alert: AlertDto): boolean {
    return alert.status !== 'seen' && alert.status !== 'reported';
  }
}
