import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { RemindersApiService } from 'src/app/services/reminders-api.service';
import { UserListRow, UsersApiService } from 'src/app/services/users-api.service';

interface PatientTableRow extends UserListRow {
  phone: string;
}

@Component({
  selector: 'app-nurse-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
  ],
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.scss'],
})
export class NurseDashboardComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    this.dataSource.paginator = p ?? null;
  }

  loading = true;
  loadError = false;

  dataSource = new MatTableDataSource<PatientTableRow>([]);

  /** Kept for the HTML template (ngIf empty check, badge notification). */
  get patientRows(): PatientTableRow[] {
    return this.dataSource.data;
  }

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
    this.loadPhase1();
  }

  /** Phase 1: fetch only counts so KPIs render immediately. */
  private loadPhase1(): void {
    forkJoin({
      openCount: this.alertsApi.getOpenCount().pipe(catchError(() => of({ count: 0 }))),
      pendingCount: this.remindersApi.getPendingCount().pipe(catchError(() => of({ count: 0 }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ openCount, pendingCount }) => {
          this.activeAlerts = openCount.count;
          this.pendingReminders = pendingCount.count;
          this.cdr.markForCheck();
          this.loadPhase2();
        },
        error: () => {
          this.loadPhase2();
        },
      });
  }

  /** Phase 2: fetch patient list and recent alerts (table + alerts panel). */
  private loadPhase2(): void {
    forkJoin({
      patients: this.usersApi.getPatients(),
      alerts: this.alertsApi.getAlerts({ limit: 20 }).pipe(catchError(() => of([] as AlertDto[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ patients, alerts }) => {
          this.dataSource.data = patients.map((p) => ({
            ...p,
            phone: p.phone?.trim() || '—',
          }));
          this.assignedPatients = patients.length;

          this.recentAlerts = alerts
            .filter((a) => a.status === 'open')
            .sort((a, b) => {
              const ta = new Date(a.createdAt ?? 0).getTime();
              const tb = new Date(b.createdAt ?? 0).getTime();
              return tb - ta;
            })
            .slice(0, 5);

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.activeAlerts = null;
          this.pendingReminders = null;
          this.cdr.markForCheck();
        },
      });
  }

  severityClass(sev: string): string {
    const s = (sev || '').toLowerCase();
    if (s === 'critical' || s === 'high') return 'sev-high';
    if (s === 'medium') return 'sev-medium';
    return 'sev-low';
  }
}
