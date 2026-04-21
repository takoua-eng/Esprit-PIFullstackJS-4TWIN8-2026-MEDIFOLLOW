import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import {
  AlertDto,
  AlertsApiService,
} from 'src/app/services/alerts-api.service';
import { UserListRow, UsersApiService } from 'src/app/services/users-api.service';

@Component({
  selector: 'app-nurse-alerts',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
  ],
  templateUrl: './nurse-alerts.component.html',
  styleUrls: ['./nurse-alerts.component.scss'],
})
export class NurseAlertsComponent implements OnInit {
  loading = true;
  error: string | null = null;
  alerts: AlertDto[] = [];
  filter: 'all' | 'open' = 'open';
  
  patients: UserListRow[] = [];
  selectedPatientId = '';

  displayedColumns: string[] = [
    'createdAt',
    'patientName',
    'severity',
    'parameter',
    'message',
    'status',
  ];

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly usersApi: UsersApiService
  ) {}

  ngOnInit(): void {
    this.usersApi.getPatients().subscribe({
      next: (rows: UserListRow[]) => {
        this.patients = rows;
      }
    });
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.alertsApi.getAlerts({ 
      patientId: this.selectedPatientId || undefined 
    }).subscribe({
      next: (rows) => {
        this.alerts = rows;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load alerts', err);
        const status = err?.status ? `HTTP ${err.status}` : 'Network/API error';
        this.error = `${status}`;
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

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'sev-high';
    if (s === 'medium') return 'sev-medium';
    return 'sev-low';
  }
}
