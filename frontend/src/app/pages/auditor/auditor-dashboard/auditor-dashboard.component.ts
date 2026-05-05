import { Component, OnInit, OnDestroy } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { interval, Subscription, forkJoin, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { API_BASE_URL } from 'src/app/core/api.config';

@Component({
  selector: 'app-auditor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, TablerIconComponent],
  templateUrl: './auditor-dashboard.component.html',
  styleUrls: ['./auditor-dashboard.component.scss'],
})
export class AuditorDashboardComponent implements OnInit, OnDestroy {
  lastRefresh = new Date();
  private sub?: Subscription;

  // ── AI Audit Insights ──────────────────────────────────────
  aiAuditReport: {
    riskScore: number; riskLevel: string; resume: string;
    alertes: string[]; risques: string[]; interpretation: string;
    actions: string[]; topUsers: string[];
  } | null = null;
  aiAuditLoading = false;
  aiAuditGeneratedAt: string | null = null;

  // ── KPIs patients ──────────────────────────────────────────
  totalPatients    = 0;
  okPatients       = 0;
  incompletePatients = 0;
  noDataPatients   = 0;
  complianceRate   = 0;

  // ── KPIs coordinators ──────────────────────────────────────
  totalCoordinators   = 0;
  avgPatientsPerCoord = 0;
  avgCompleteness     = 0;
  remindersToday      = 0;

  // ── KPIs reminders ─────────────────────────────────────────
  totalReminders   = 0;
  sentReminders    = 0;
  successRate      = 0;
  avgDelayMin: number | null = null;

  // ── Top coordinators (top 3 by reminders sent) ─────────────
  topCoordinators: { name: string; remindersSent: number; patientCount: number }[] = [];

  // ── Status breakdown for mini bar ──────────────────────────
  get okPct():         number { return this.totalPatients ? Math.round(this.okPatients / this.totalPatients * 100) : 0; }
  get incompletePct(): number { return this.totalPatients ? Math.round(this.incompletePatients / this.totalPatients * 100) : 0; }
  get noDataPct():     number { return this.totalPatients ? Math.round(this.noDataPatients / this.totalPatients * 100) : 0; }

  quickLinks = [
    { label: 'Patients',      desc: 'Compliance status',       icon: 'users',          color: '#0984e3', route: '/auditor/patients' },
    { label: 'Coordinateurs', desc: 'Performance overview',    icon: 'users-group',    color: '#6c5ce7', route: '/auditor/coordinators' },
    { label: 'Reminders',     desc: 'Communication history',   icon: 'bell',           color: '#e17055', route: '/auditor/reminders' },
    { label: 'Anomalies',     desc: 'Missing data detection',  icon: 'alert-triangle', color: '#d63031', route: '/auditor/anomalies' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAuditAI();
    this.sub = interval(60000).pipe(
      startWith(0),
      switchMap(() => forkJoin({
        patients:     this.http.get<any[]>(`${API_BASE_URL}/coordinator/auditor/patients-overview`).pipe(catchError(() => of([]))),
        coordinators: this.http.get<any[]>(`${API_BASE_URL}/coordinator/all/performance`).pipe(catchError(() => of([]))),
        reminders:    this.http.get<any>(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).pipe(catchError(() => of({ stats: {}, reminders: [] }))),
      })),
    ).subscribe(({ patients, coordinators, reminders }) => {
      this.lastRefresh = new Date();
      const pts  = patients as any[];
      const coords = coordinators as any[];
      const remStats = (reminders as any).stats ?? {};

      // Patients
      this.totalPatients     = pts.length;
      this.okPatients        = pts.filter(p => p.status === 'OK').length;
      this.incompletePatients = pts.filter(p => p.status === 'INCOMPLETE').length;
      this.noDataPatients    = pts.filter(p => p.status === 'NO DATA').length;
      this.complianceRate    = this.totalPatients ? Math.round(this.okPatients / this.totalPatients * 100) : 0;

      // Coordinators
      this.totalCoordinators   = coords.length;
      this.avgPatientsPerCoord = coords.length ? Math.round(coords.reduce((s: number, c: any) => s + c.patientCount, 0) / coords.length) : 0;
      this.avgCompleteness     = coords.length ? Math.round(coords.reduce((s: number, c: any) => s + c.completenessRate, 0) / coords.length) : 0;
      this.remindersToday      = coords.reduce((s: number, c: any) => s + c.remindersToday, 0);
      this.topCoordinators     = coords.slice(0, 3).map((c: any) => ({ name: c.name, remindersSent: c.remindersSent, patientCount: c.patientCount }));

      // Reminders
      this.totalReminders = remStats.total ?? 0;
      this.sentReminders  = remStats.sentCount ?? 0;
      this.successRate    = remStats.successRate ?? 0;
      this.avgDelayMin    = remStats.avgDelayMin ?? null;
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  loadAuditAI(): void {
    this.aiAuditLoading = true;
    this.http.post<any>(`${API_BASE_URL}/ai/audit-report`, {})
      .pipe(catchError(() => of({ report: null, generatedAt: null })))
      .subscribe(res => {
        this.aiAuditReport     = res.report;
        this.aiAuditGeneratedAt = res.generatedAt;
        this.aiAuditLoading    = false;
      });
  }

  delayLabel(min: number | null): string {
    if (min === null) return '—';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }
}
