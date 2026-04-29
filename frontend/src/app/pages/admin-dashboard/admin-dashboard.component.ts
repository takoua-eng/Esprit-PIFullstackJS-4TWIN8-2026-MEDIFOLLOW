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
  TrafficStatsResponse,
  TrafficViewMode,
} from 'src/app/services/admin-api.service';
import { Chart } from 'chart.js/auto';
import { RouterModule } from '@angular/router';

// ─── Types locaux ────────────────────────────────────────────────────────────
interface DashboardStats {
  // Champs backend existants
  totalPatients:     number;
  totalPhysicians:   number;
  totalNurses:       number;
  totalCoordinators: number;
  totalAuditors:     number;
  patientsThisMonth: number;
  newUsersThisWeek:  number;
  activePatients:    number;

  // Alias frontend
  patients:     number;
  doctors:      number;
  nurses:       number;
  coordinators: number;

  // Nouveaux
  activeAlerts:   number;
  criticalAlerts: number;
  complianceRate: number;

  // Données imbriquées
  alerts?:         any[];
  recentPatients?: any[];
  compliance?: {
    vitals:        number;
    symptoms:      number;
    glucose:       number;
    weight:        number;
    questionnaire: number;
  };
}
interface AdminUserRow {
  name: string;
  email: string;
  role: string;
  service: string;
  status: 'Active' | 'Inactive';
}

interface AlertItem {
  id: string;
  type: 'CRITICAL' | 'WARNING';
  patientName: string;
  parameter: string;
  value: string | number;
  triggeredAt: Date;
  /** Champ legacy conservé pour compatibilité avec l'ancienne section Alerts */
  message?: string;
  date?: Date;
  severity?: string;
}

interface ComplianceItem {
  label: string;
  pct: number;
}

interface RecentPatient {
  _id: string;
  firstName: string;
  lastName: string;
  primaryDiagnosis?: { condition: string };
  assignedNurse?: { firstName: string };
  alertStatus?: 'CRITICAL' | 'WARNING' | 'STABLE';
}

interface ActivityItem {
  user: string;
  action: string;
  service: string;
  role: string;
  time: Date;
}

interface DepartmentItem {
  name: string;
  percentage: number;
  color: 'primary' | 'accent' | 'warn';
}

// ─── Composant ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    AppProfitExpensesComponent,
    TablerIconsModule,
    TranslateModule,
    RouterModule,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {

  // ── Injections ─────────────────────────────────────────────────────────────
  private readonly adminApi        = inject(AdminApiService);
  private readonly dashboardService = inject(DashboardService);
  private readonly destroyRef      = inject(DestroyRef);
  private readonly translate       = inject(TranslateService);
  private readonly cdr             = inject(ChangeDetectorRef);

  /** Émet à chaque changement de mode traffic (day / month / year). */
  private readonly viewMode$ = new BehaviorSubject<TrafficViewMode>('month');

  // ── Stats générales ────────────────────────────────────────────────────────
  stats: any = {};
  statsLoading = true;
  statsError: string | null = null;
  currentPeriod = "Aujourd'hui";

  // ── Traffic ────────────────────────────────────────────────────────────────
  trafficStats: TrafficStatsResponse | null = null;
  trafficLoading  = false;
  trafficError: string | null = null;
  trafficMetricsFlash = false;
  private trafficPending = 0;

  // ── KPI flash ──────────────────────────────────────────────────────────────
  kpiStatsFlash = false;

  // ── Alertes ────────────────────────────────────────────────────────────────
  alerts: AlertItem[] = [];
  filteredAlerts: AlertItem[] = [];
  alertFilter: 'all' | 'critical' | 'warning' = 'all';

  // ── Compliance ────────────────────────────────────────────────────────────
  complianceItems: ComplianceItem[] = [];

  // ── Patients récents ──────────────────────────────────────────────────────
  recentPatients: RecentPatient[] = [];

  // ── Activité & départements ───────────────────────────────────────────────
  recentActivity: ActivityItem[] = [
    { user: 'Super Admin',    action: 'Logged in',      service: 'Global',    role: 'Admin',     time: new Date() },
    { user: 'Dr. Ben Salah',  action: 'Updated record', service: 'Cardiology',role: 'Physician', time: new Date() },
    { user: 'Nurse Amira',    action: 'Added notes',    service: 'Oncology',  role: 'Nurse',     time: new Date() },
    { user: 'Auditor Sameh',  action: 'Exported report',service: 'Quality',   role: 'Auditor',   time: new Date() },
  ];

  departmentOccupancy: DepartmentItem[] = [
    { name: 'Cardiology', percentage: 85, color: 'primary' },
    { name: 'Oncology',   percentage: 60, color: 'accent'  },
    { name: 'Surgery',    percentage: 90, color: 'warn'    },
  ];

  // ── KPI trends ─────────────────────────────────────────────────────────────
  kpiTrends = {
    patients:     { value: 5, isUp: true,  period: 'this week' },
    doctors:      { value: 2, isUp: true,  period: 'this week' },
    nurses:       { value: 1, isUp: true,  period: 'this week' },
    coordinators: { value: 0, isUp: true,  period: 'this week' },
    auditors:     { value: 0, isUp: false, period: 'this week' },
  };

  // ── Table utilisateurs (conservée) ────────────────────────────────────────
  displayedColumns: string[] = ['name', 'email', 'role', 'service', 'status', 'actions'];
  users: AdminUserRow[] = [
    { name: 'Super Admin',        email: 'super.admin@hospital.tn',       role: 'Admin',       service: 'Global',     status: 'Active'   },
    { name: 'Admin Chirurgie',    email: 'admin.chirurgie@hospital.tn',   role: 'Admin',       service: 'Surgery',    status: 'Active'   },
    { name: 'John Patient',       email: 'john.patient@hospital.tn',      role: 'Patient',     service: 'Cardiology', status: 'Active'   },
    { name: 'Sarah Patient',      email: 'sarah.patient@hospital.tn',     role: 'Patient',     service: 'Oncology',   status: 'Inactive' },
    { name: 'Dr. Ben Salah',      email: 'dr.bensalah@hospital.tn',       role: 'Physician',   service: 'Cardiology', status: 'Active'   },
    { name: 'Nurse Amira',        email: 'amira.nurse@hospital.tn',       role: 'Nurse',       service: 'Oncology',   status: 'Active'   },
    { name: 'Coordinator Anis',   email: 'anis.coordinator@hospital.tn',  role: 'Coordinator', service: 'Cardiology', status: 'Inactive' },
    { name: 'Auditor Sameh',      email: 'sameh.audit@hospital.tn',       role: 'Auditor',     service: 'Quality',    status: 'Active'   },
  ];

  // ── Chart ──────────────────────────────────────────────────────────────────
  private chartInstance: Chart | null = null;

  // ════════════════════════════════════════════════════════════════════════════
  // GETTERS
  // ════════════════════════════════════════════════════════════════════════════

  get viewMode(): TrafficViewMode { return this.viewMode$.value; }
  set viewMode(value: TrafficViewMode) { this.viewMode$.next(value); }

  get totalUsers():       number { return this.users.length; }
  get totalPatients():    number { return this.users.filter(u => u.role === 'Patient').length; }
  get totalPhysicians():  number { return this.users.filter(u => u.role === 'Physician').length; }
  get totalNurses():      number { return this.users.filter(u => u.role === 'Nurse').length; }
  get totalCoordinators():number { return this.users.filter(u => u.role === 'Coordinator').length; }
  get totalAuditors():    number { return this.users.filter(u => u.role === 'Auditor').length; }

  get trafficPeriodLabel(): string {
    const now = new Date();
    const loc = this.resolveTrafficLocale();
    if (this.viewMode === 'day') {
      return new Intl.DateTimeFormat(loc, {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      }).format(now);
    }
    if (this.viewMode === 'month') {
      return new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' }).format(now);
    }
    const y = now.getFullYear();
    const fmt = new Intl.DateTimeFormat(loc, { month: 'long' });
    return `${this.capitalizeFirst(fmt.format(new Date(y, 0)))} – ${this.capitalizeFirst(fmt.format(new Date(y, 11)))} ${y}`;
  }

  get trafficVolumeTotal(): number {
    const t = this.trafficStats;
    if (!t) return 0;
    return (Number(t.visits) || 0)
         + (Number(t.uniqueUsers) || 0)
         + (Number(t.pageViews) || 0)
         + (Number(t.newPatients) || 0);
  }

  trafficShare(value: number | null | undefined): number {
    const v = Number(value);
    const total = this.trafficVolumeTotal;
    if (!Number.isFinite(v) || total <= 0) return 0;
    return (v / total) * 100;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CONSTRUCTEUR — abonnement viewMode$ pour le trafic
  // ════════════════════════════════════════════════════════════════════════════

  constructor() {
    // Rechargement i18n
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    // Trafic : rechargement à chaque changement de mode
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

  // ════════════════════════════════════════════════════════════════════════════
  // LIFECYCLE
  // ════════════════════════════════════════════════════════════════════════════

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Chart initialisé via initTrafficChart() après réception des données
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHARGEMENT DONNÉES
  // ════════════════════════════════════════════════════════════════════════════

  setPeriod(period: string): void {
    this.currentPeriod = period;
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.statsLoading = true;
    this.statsError   = null;

    this.dashboardService
      .getDashboardStats()
      .pipe(finalize(() => (this.statsLoading = false)))
      .subscribe({
        next: (data: any) => {
          this.statsError = null;
          this.stats      = data ?? {};
          this.triggerKpiFlash();

          // ── Alertes ─────────────────────────────────────────────────────
          // Si l'API retourne des alertes structurées → les mapper
          // Sinon → tableau vide (pas de données mockées)
          if (Array.isArray(data?.alerts)) {
            this.alerts = (data.alerts as any[]).map((a) => ({
              id:          a._id ?? a.id ?? '',
              type:        a.type === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
              patientName: a.patientName ?? a.patient?.firstName ?? '—',
              parameter:   a.parameter ?? '',
              value:       a.value ?? '',
              triggeredAt: new Date(a.triggeredAt ?? a.date ?? Date.now()),
            }));
          } else {
            this.alerts = [];
          }
          this.setAlertFilter(this.alertFilter);

          // ── Compliance ──────────────────────────────────────────────────
          if (data?.compliance) {
            this.complianceItems = [
              { label: 'Vitaux',        pct: data.compliance.vitals        ?? 0 },
              { label: 'Symptômes',     pct: data.compliance.symptoms      ?? 0 },
              { label: 'Glycémie',      pct: data.compliance.glucose       ?? 0 },
              { label: 'Poids',         pct: data.compliance.weight        ?? 0 },
              { label: 'Questionnaire', pct: data.compliance.questionnaire ?? 0 },
            ];
          } else {
            // Valeurs de démonstration si l'API ne retourne pas encore compliance
            this.complianceItems = [
              { label: 'Vitaux',        pct: 85 },
              { label: 'Symptômes',     pct: 72 },
              { label: 'Glycémie',      pct: 60 },
              { label: 'Poids',         pct: 55 },
              { label: 'Questionnaire', pct: 40 },
            ];
          }

          // ── Patients récents ─────────────────────────────────────────────
          if (Array.isArray(data?.recentPatients)) {
            this.recentPatients = data.recentPatients;
          } else {
            this.recentPatients = [];
          }

          setTimeout(() => this.initTrafficChart(), 0);
        },
        error: (err: unknown) => {
          this.statsError = this.resolveStatsErrorMessage(err);
        },
      });
  }

  exportDashboard(): void {
    // TODO : brancher sur ton service d'export CSV/PDF
    console.warn('Export non encore implémenté');
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ALERTES
  // ════════════════════════════════════════════════════════════════════════════

  setAlertFilter(f: 'all' | 'critical' | 'warning'): void {
    this.alertFilter    = f;
    this.filteredAlerts = f === 'all'
      ? this.alerts
      : this.alerts.filter(a => a.type === f.toUpperCase());
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CHART
  // ════════════════════════════════════════════════════════════════════════════

  initTrafficChart(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }

    const canvas = document.getElementById('trafficChart') as HTMLCanvasElement | null;
    if (!canvas) return;

    const chartData = this.trafficStats?.chartData ?? [];
    const labels      = chartData.length ? chartData.map(d => d.label)                 : ['8h','10h','12h','14h','16h','18h'];
    const dataVisites = chartData.length ? chartData.map(d => d.value)                 : [120, 190, 300, 250, 220, 310];
    const dataNouveaux= chartData.length ? chartData.map(d => (d as any).newPatients ?? 0) : [10, 25, 30, 28, 40, 47];

    this.chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Visites',
            data: dataVisites,
            borderColor: '#378ADD',
            backgroundColor: 'rgba(55,138,221,0.07)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 1.5,
          },
          {
            label: 'Nouveaux patients',
            data: dataNouveaux,
            borderColor: '#1D9E75',
            backgroundColor: 'rgba(29,158,117,0.07)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            borderWidth: 1.5,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } }, min: 0 },
        },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPERS PRIVÉS
  // ════════════════════════════════════════════════════════════════════════════

  private triggerTrafficMetricsFlash(): void {
    this.trafficMetricsFlash = true;
    setTimeout(() => (this.trafficMetricsFlash = false), 450);
  }

  private triggerKpiFlash(): void {
    this.kpiStatsFlash = true;
    setTimeout(() => (this.kpiStatsFlash = false), 450);
  }

  private resolveTrafficLocale(): string {
    const lang = this.translate.currentLang || this.translate.getDefaultLang() || 'fr';
    if (lang.toLowerCase().startsWith('ar')) return 'ar';
    if (lang.toLowerCase().startsWith('en')) return 'en-US';
    return 'fr-FR';
  }

  private capitalizeFirst(text: string): string {
    if (!text) return text;
    return text.charAt(0).toLocaleUpperCase(this.resolveTrafficLocale()) + text.slice(1);
  }

  private resolveTrafficErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | string | null;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const m = body.message;
        if (Array.isArray(m) && m.length) return m.map(String).join(' ');
        if (typeof m === 'string' && m.trim()) return m.trim();
      }
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (err.status === 0) return 'Serveur injoignable. Les données affichées correspondent au dernier chargement réussi.';
    }
    return 'Impossible de charger le trafic pour cette période.';
  }

  private resolveStatsErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string | string[] } | string | null;
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        const m = body.message;
        if (Array.isArray(m) && m.length) return m.map(String).join(' ');
        if (typeof m === 'string' && m.trim()) return m.trim();
      }
      if (typeof body === 'string' && body.trim()) return body.trim();
      if (err.status === 0) return 'Serveur injoignable. Vérifiez que l\'API est démarrée.';
    }
    return 'Impossible de mettre à jour les statistiques.';
  }
}