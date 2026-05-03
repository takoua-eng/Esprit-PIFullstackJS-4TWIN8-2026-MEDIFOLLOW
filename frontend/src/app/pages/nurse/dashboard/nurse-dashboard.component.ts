import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { RemindersApiService } from 'src/app/services/reminders-api.service';
import {
  UserApiRow,
  UserListRow,
  UsersApiService,
} from 'src/app/services/users-api.service';

@Component({
  selector: 'app-nurse-dashboard',
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.scss'],
})
export class NurseDashboardComponent implements OnInit {
  loading = true;
  loadError = false;

  patientRows: UserListRow[] = [];
  private patientDetails = new Map<string, UserApiRow>();

  assignedPatients = 0;
  activeAlerts: number | null = null;
  pendingReminders: number | null = null;

  recentAlerts: AlertDto[] = [];

  displayedColumns: string[] = ['name', 'email', 'phone', 'actions'];

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly remindersApi: RemindersApiService,
    private readonly usersApi: UsersApiService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.loadError = false;
    forkJoin({
      patients: this.usersApi.getPatients(),
      users: this.usersApi.getAllUsers(),
      alerts: this.alertsApi.getAlerts(),
      openCount: this.alertsApi.getOpenCount(),
      pendingCount: this.remindersApi.getPendingCount(),
    }).subscribe({
      next: ({ patients, users, alerts, openCount, pendingCount }) => {
        this.patientRows = patients;
        this.patientDetails = new Map(users.map((u) => [u._id, u]));
        this.assignedPatients = patients.length;
        this.activeAlerts = openCount.count;
        this.pendingReminders = pendingCount.count;
        this.recentAlerts = alerts
          .filter((a) => a.status === 'open')
          .sort((a, b) => {
            const ta = new Date(a.createdAt ?? 0).getTime();
            const tb = new Date(b.createdAt ?? 0).getTime();
            return tb - ta;
          })
          .slice(0, 5);
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
        this.activeAlerts = null;
        this.pendingReminders = null;
      },
    });
  }

  phoneFor(p: UserListRow): string {
    const v = this.patientDetails.get(p._id)?.phone?.trim();
    return v || '—';
  }

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'sev-high';
    if (s === 'medium') return 'sev-medium';
    return 'sev-low';
  }
}
