import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  AfterViewInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { AppProfitExpensesComponent } from 'src/app/components/profit-expenses/profit-expenses.component';
import { TablerIconsModule } from 'angular-tabler-icons';
import {
  BehaviorSubject,
  catchError,
  defer,
  distinctUntilChanged,
  EMPTY,
  finalize,
  switchMap,
} from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
import {
  AdminApiService,
  AdminStats,
  TrafficStatsResponse,
  TrafficViewMode,
} from 'src/app/services/admin-api.service';
import { Chart } from 'chart.js/auto';

interface AdminUserRow {
  name: string;
  email: string;
  role: string;
  service: string;
  status: 'Active' | 'Inactive';
}

@Component({
  selector: 'app-admin-dashboard',
  imports: [
    CommonModule,
    MaterialModule,
    AppProfitExpensesComponent,
    TablerIconsModule,
    TranslateModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  private readonly adminApi = inject(AdminApiService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  /** Émet à chaque changement de période traffic (day / month / year). */
  private readonly viewMode$ = new BehaviorSubject<TrafficViewMode>('month');

  stats: any = null;
  statsLoading = true;
  /** Message affiché si l’appel GET /api/admin/stats échoue. */
  statsError: string | null = null;

  currentPeriod: string = 'Aujourd\'hui';

  setPeriod(period: string) {
    this.currentPeriod = period;
    this.loadDashboardData();
  }

  /** Résultat de GET /admin/traffic-stats pour le mode courant. */
  trafficStats: TrafficStatsResponse | null = null;

  /** Chargement traffic (changement de période). */
  trafficLoading = false;
  private trafficPending = 0;

  /** Erreur traffic : message affiché, données précédentes conservées. */
  trafficError: string | null = null;

  /** Pulse visuel sur les métriques traffic après mise à jour réussie. */
  trafficMetricsFlash = false;

  /** Pulse sur les KPI admin après chargement réussi. */
  kpiStatsFlash = false;

  displayedColumns: string[] = ['name', 'email', 'role', 'service', 'status', 'actions'];

  users: AdminUserRow[] = [
    { name: 'Super Admin', email: 'super.admin@hospital.tn', role: 'Admin', service: 'Global', status: 'Active' },
    { name: 'Admin Chirurgie', email: 'admin.chirurgie@hospital.tn', role: 'Admin', service: 'Surgery', status: 'Active' },
    { name: 'John Patient', email: 'john.patient@hospital.tn', role: 'Patient', service: 'Cardiology', status: 'Active' },
    { name: 'Sarah Patient', email: 'sarah.patient@hospital.tn', role: 'Patient', service: 'Oncology', status: 'Inactive' },
    { name: 'Dr. Ben Salah', email: 'dr.bensalah@hospital.tn', role: 'Physician', service: 'Cardiology', status: 'Active' },
    { name: 'Nurse Amira', email: 'amira.nurse@hospital.tn', role: 'Nurse', service: 'Oncology', status: 'Active' },
    { name: 'Coordinator Anis', email: 'anis.coordinator@hospital.tn', role: 'Coordinator', service: 'Cardiology', status: 'Inactive' },
    { name: 'Auditor Sameh', email: 'sameh.audit@hospital.tn', role: 'Auditor', service: 'Quality', status: 'Active' },
  ];

  alerts: { id: string; message: string; date: Date; severity: string }[] = [];

  recentActivity = [
    { user: 'Super Admin', action: 'Logged in', service: 'Global', role: 'Admin', time: new Date() },
    { user: 'Dr. Ben Salah', action: 'Updated record', service: 'Cardiology', role: 'Physician', time: new Date() },
    { user: 'Nurse Amira', action: 'Added notes', service: 'Oncology', role: 'Nurse', time: new Date() },
    { user: 'Auditor Sameh', action: 'Exported report', service: 'Quality', role: 'Auditor', time: new Date() },
  ];

  departmentOccupancy = [
    { name: 'Cardiology', percentage: 85, color: 'primary' },
    { name: 'Oncology', percentage: 60, color: 'accent' },
    { name: 'Surgery', percentage: 90, color: 'warn' }
  ];

  kpiTrends = {
    patients: { value: 5, isUp: true, period: 'this week' },
    doctors: { value: 2, isUp: true, period: 'this week' },
    nurses: { value: 1, isUp: true, period: 'this week' },
    coordinators: { value: 0, isUp: true, period: 'this week' },
    auditors: { value: 0, isUp: true, period: 'this week' },
  };

  get totalUsers(): number {
    return this.users.length;
  }

  get totalPatients(): number {
    return this.users.filter((u) => u.role === 'Patient').length;
  }

  get totalPhysicians(): number {
    return this.users.filter((u) => u.role === 'Physician').length;
  }

  get totalNurses(): number {
    return this.users.filter((u) => u.role === 'Nurse').length;
  }

  get totalCoordinators(): number {
    return this.users.filter((u) => u.role === 'Coordinator').length;
  }

  get totalAuditors(): number {
    return this.users.filter((u) => u.role === 'Auditor').length;
  }

  get viewMode(): TrafficViewMode {
    return this.viewMode$.value;
  }

  set viewMode(value: TrafficViewMode) {
    this.viewMode$.next(value);
  }

  /** Libellé de période sous « Trafic » : date actuelle, selon le mode et la langue. */
  get trafficPeriodLabel(): string {
    const now = new Date();
    const loc = this.resolveTrafficLocale();
    if (this.viewMode === 'day') {
      return new Intl.DateTimeFormat(loc, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(now);
    }
    if (this.viewMode === 'month') {
      return new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(now);
    }
    const y = now.getFullYear();
    const monthFmt = new Intl.DateTimeFormat(loc, { month: 'long' });
    const start = this.capitalizeFirst(monthFmt.format(new Date(y, 0, 1)));
    const end = this.capitalizeFirst(monthFmt.format(new Date(y, 11, 1)));
    return `${start} – ${end} ${y}`;
  }

  private resolveTrafficLocale(): string {
    const lang =
      this.translate.currentLang || this.translate.getDefaultLang() || 'fr';
    if (lang.toLowerCase().startsWith('ar')) {
      return 'ar';
    }
    if (lang.toLowerCase().startsWith('en')) {
      return 'en-US';
    }
    return 'fr-FR';
  }

  private capitalizeFirst(text: string): string {
    if (!text) {
      return text;
    }
    return text.charAt(0).toLocaleUpperCase(this.resolveTrafficLocale()) + text.slice(1);
  }

  /** Somme des volumes traffic (dénominateur pour les parts en %). */
  get trafficVolumeTotal(): number {
    const t = this.trafficStats;
    if (!t) {
      return 0;
    }
    return (
      (Number(t.visits) || 0) +
      (Number(t.uniqueUsers) || 0) +
      (Number(t.pageViews) || 0) +
      (Number(t.newPatients) || 0)
    );
  }

  /** (value / total) * 100 avec total = somme visits + uniqueUsers + pageViews + newPatients. */
  trafficShare(value: number | null | undefined): number {
    const v = Number(value);
    const total = this.trafficVolumeTotal;
    if (!Number.isFinite(v) || total <= 0) {
      return 0;
    }
    return (v / total) * 100;
  }

  constructor() {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    this.viewMode$
      .pipe(
        distinctUntilChanged(),
        switchMap((mode) =>
          defer(() => {
            this.trafficPending++;
            this.trafficLoading = true;
            return this.adminApi.getTrafficStats(mode).pipe(
              catchError((err: unknown) => {
                this.trafficError = this.resolveTrafficErrorMessage(err);
                return EMPTY;
              }),
              finalize(() => {
                this.trafficPending--;
                this.trafficLoading = this.trafficPending > 0;
              }),
            );
          }),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data: any) => {
          this.trafficError = null;
          this.trafficStats = data;
          this.triggerTrafficMetricsFlash();
          setTimeout(() => this.initTrafficChart(), 0);
        },
      });
  }

  private triggerTrafficMetricsFlash(): void {
    this.trafficMetricsFlash = true;
    setTimeout(() => {
      this.trafficMetricsFlash = false;
    }, 450);
  }

  private triggerKpiFlash(): void {
    this.kpiStatsFlash = true;
    setTimeout(() => {
      this.kpiStatsFlash = false;
    }, 450);
  }

  private resolveTrafficErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | string | null;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const m = body.message;
        if (Array.isArray(m) && m.length) {
          return m.map(String).join(' ');
        }
        if (typeof m === 'string' && m.trim()) {
          return m.trim();
        }
      }
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      if (err.status === 0) {
        return 'Serveur injoignable. Les données affichées correspondent au dernier chargement réussi.';
      }
    }
    return 'Impossible de charger le traffic pour cette période. Affichage des dernières données connues.';
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.statsLoading = true;
    this.statsError = null;
    this.dashboardService
      .getDashboardStats()
      .pipe(finalize(() => (this.statsLoading = false)))
      .subscribe({
        next: (data) => {
          this.statsError = null;
          this.stats = data ?? {};
          this.triggerKpiFlash();
          setTimeout(() => this.initTrafficChart(), 0);
        },
        error: (err: unknown) => {
          this.statsError = this.resolveStatsErrorMessage(err);
        },
      });
  }

  private resolveStatsErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | string | null;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const m = body.message;
        if (Array.isArray(m) && m.length) {
          return m.map(String).join(' ');
        }
        if (typeof m === 'string' && m.trim()) {
          return m.trim();
        }
      }
      if (typeof body === 'string' && body.trim()) {
        return body.trim();
      }
      if (err.status === 0) {
        return 'Serveur injoignable. Vérifiez la connexion ou que l’API est démarrée.';
      }
    }
    return 'Impossible de mettre à jour les statistiques. Les valeurs affichées restent celles du dernier chargement réussi.';
  }

  chartInstance: Chart | null = null;

  initTrafficChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    const canvas = document.getElementById('trafficChart') as HTMLCanvasElement;
    if (canvas) {
      const chartData = this.trafficStats?.chartData || [];
      const labels = chartData.length ? chartData.map(d => d.label) : ['8h', '10h', '12h', '14h', '16h', '18h'];
      const dataVisites = chartData.length ? chartData.map(d => d.value) : [120, 190, 300, 250, 220, 310];
      const dataNouveaux = chartData.length ? chartData.map(d => d.newPatients || 0) : [10, 25, 30, 28, 40, 47];

      this.chartInstance = new Chart(canvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Visites',
              data: dataVisites,
              borderColor: '#378ADD',
            },
            {
              label: 'Nouveaux patients',
              data: dataNouveaux,
              borderColor: '#1D9E75',
            },
          ],
        },
        options: {
          animation: false
        }
      });
    }
  }

  ngAfterViewInit(): void {
    // Moved to initTrafficChart as it requires ngIf elements to be rendered first.
  }
}
