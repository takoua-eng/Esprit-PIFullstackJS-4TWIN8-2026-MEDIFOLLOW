import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NgApexchartsModule } from 'ng-apexcharts';
import { interval, Subscription, forkJoin, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';

import { AuditApiService, AuditLog, AuditStats } from 'src/app/services/audit.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';
import { PatientService } from 'src/app/services/superadmin/patient.service';
import { RemindersApiService } from 'src/app/services/reminders-api.service';
import { VitalsApiService } from 'src/app/services/vitals-api.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/api.config';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MaterialModule, TablerIconsModule, NgApexchartsModule, TranslateModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
})
export class AdminDashboardComponent implements OnInit, OnDestroy {

  // KPIs
  totalUsers = 0;
  totalPatients = 0;
  totalDoctors = 0;
  totalNurses = 0;
  activeAlerts = 0;
  totalReminders = 0;
  pendingReminders = 0;
  criticalAlerts = 0;
  totalServices = 0;
  totalAuditEvents = 0;
  // New
  totalQuestionnaires = 0;
  vitalsSubmittedToday = 0;
  complianceRate = 0;
  lastRefresh = new Date();

  // Alerts
  recentAlerts: AlertDto[] = [];
  criticalAlertsList: AlertDto[] = [];

  // Services
  services: any[] = [];

  // Audit
  recentLogs: AuditLog[] = [];

  // Charts
  alertsChart: any = {};
  usersRoleChart: any = {};
  activityChart: any = {};

  // Reminders charts
  remindersByCoordChart: any = {};
  remindersByPatientChart: any = {};

  // Service staff chart
  serviceStaffChart: any = {};
  serviceStaffData: { serviceId: string; doctorCount: number; nurseCount: number; patientCount: number }[] = [];

  // AI Report
  aiReportText = '';
  aiReportLoading = false;
  aiReportGeneratedAt: string | null = null;

  // AI Insights (simulated from real data)
  aiInsights: { icon: string; color: string; text: string }[] = [];

  // Users by role (from backend stats)
  usersByRole: { role: string; count: number; color: string; icon: string }[] = [];

  // AI Intelligence
  intel: any = null;
  intelLoading = false;
  Math = Math;

  private sub?: Subscription;

  constructor(
    private auditService: AuditApiService,
    private usersService: UsersApiService,
    private alertsService: AlertsApiService,
    private serviceService: ServiceService,
    private patientService: PatientService,
    private remindersService: RemindersApiService,
    private vitalsService: VitalsApiService,
    private http: HttpClient,
    private translate: TranslateService,
    private router: Router,
  ) {}

  // ── Keyboard Shortcuts ──────────────────────────────────────────
  @HostListener('document:keydown', ['$event'])
  handleKeyboard(e: KeyboardEvent): void {
    if (!e.altKey) return;
    const shortcuts: Record<string, string> = {
      KeyP: '/dashboard/admin/patients',
      KeyD: '/dashboard/admin/physicians',
      KeyN: '/dashboard/admin/nurses',
      KeyC: '/dashboard/admin/coordinators',
      KeyU: '/dashboard/admin/auditors',
      KeyT: '/admin/templates',
    };
    const route = shortcuts[e.code];
    if (route) {
      e.preventDefault();
      e.stopPropagation();
      this.router.navigate([route]);
    }
  }

  ngOnInit(): void {
    this.sub = interval(20000).pipe(
      startWith(0),
      switchMap(() => forkJoin({
        users:          this.usersService.getAllUsers().pipe(catchError(() => of([]))),
        alerts:         this.alertsService.getAlerts().pipe(catchError(() => of([]))),
        services:       this.serviceService.getServices().pipe(catchError(() => of([]))),
        patients:       this.patientService.getPatients().pipe(catchError(() => of([]))),
        stats:          this.auditService.getStats().pipe(catchError(() => of(null))),
        logs:           this.auditService.getLogs().pipe(catchError(() => of([]))),
        reminders:      this.http.get<any>(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).pipe(catchError(() => of({ stats: {}, reminders: [] }))),
        questionnaires: this.http.get<any[]>(`${API_BASE_URL}/questionnaire-responses`).pipe(catchError(() => of([]))),
        serviceStaff:   this.http.get<any[]>(`${API_BASE_URL}/coordinator/auditor/service-staff`).pipe(catchError(() => of([]))),
      })),
    ).subscribe({
      next: ({ users, alerts, services, patients, stats, logs, reminders, questionnaires, serviceStaff }) => {
        this.lastRefresh = new Date();
        this.applyUsers(users as any[]);
        this.applyAlerts(alerts as AlertDto[]);
        this.applyServices(services as any[]);
        this.totalPatients = (patients as any[]).length;
        if (stats) this.applyAuditStats(stats as AuditStats);
        this.recentLogs = (logs as AuditLog[]).slice(0, 6);
        this.generateAiInsights(alerts as AlertDto[], patients as any[]);

        // Reminders — from auditor overview endpoint
        const remStats = (reminders as any).stats ?? {};
        const remRows  = (reminders as any).reminders ?? [];
        this.totalReminders   = remStats.total ?? 0;
        this.pendingReminders = remStats.scheduledCount ?? 0;
        this.buildRemindersByCoordChart(remRows);
        this.buildRemindersByPatientChart(remRows);

        // Questionnaires
        this.totalQuestionnaires = (questionnaires as any[]).length;

        // Service staff chart
        this.serviceStaffData = serviceStaff as any[];
        this.buildServiceStaffChart(serviceStaff as any[], services as any[]);
        this.http.get<any[]>(`${API_BASE_URL}/coordinator/auditor/patients-overview`)
          .pipe(catchError(() => of([])))
          .subscribe(pts => {
            this.vitalsSubmittedToday = pts.filter((p: any) => p.vitalsToday).length;
            const total = pts.length;
            this.complianceRate = total > 0
              ? Math.round(pts.filter((p: any) => p.status === 'OK').length / total * 100)
              : 0;
          });
      },
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  generateAiReport(type: string): void {
    this.aiReportLoading = true;
    this.aiReportText = '';
    this.http.post<any>(`${API_BASE_URL}/coordinator/admin/ai-report`, { type })
      .pipe(catchError(() => of({ response: 'Service AI indisponible.' })))
      .subscribe(res => {
        this.aiReportText = res.response ?? '';
        this.aiReportGeneratedAt = res.generatedAt ?? new Date().toISOString();
        this.aiReportLoading = false;
      });
  }

  // ── Data processors ──────────────────────────────────────────────

  private applyUsers(users: any[]): void {
    this.totalUsers = users.length;
    const roleMap: Record<string, number> = {};
    users.forEach(u => {
      const r = (u.role?.name ?? u.role ?? 'unknown').toLowerCase();
      roleMap[r] = (roleMap[r] ?? 0) + 1;
    });
    this.totalDoctors = (roleMap['doctor'] ?? 0) + (roleMap['physician'] ?? 0);
    this.totalNurses  = roleMap['nurse'] ?? 0;

    const palette: Record<string, { color: string; icon: string }> = {
      admin:       { color: '#6c5ce7', icon: 'shield-lock' },
      superadmin:  { color: '#2d3436', icon: 'crown' },
      doctor:      { color: '#0984e3', icon: 'stethoscope' },
      physician:   { color: '#0984e3', icon: 'stethoscope' },
      nurse:       { color: '#00b894', icon: 'nurse' },
      coordinator: { color: '#fdcb6e', icon: 'users-group' },
      auditor:     { color: '#a29bfe', icon: 'eye' },
      patient:     { color: '#e17055', icon: 'heart-rate-monitor' },
    };
    this.usersByRole = Object.entries(roleMap).map(([role, count]) => ({
      role, count,
      color: palette[role]?.color ?? '#b2bec3',
      icon:  palette[role]?.icon  ?? 'user',
    })).sort((a, b) => b.count - a.count);

    this.buildUsersRoleChart(this.usersByRole);
  }

  private applyAlerts(alerts: AlertDto[]): void {
    const open = alerts.filter(a => a.status === 'open');
    this.activeAlerts   = open.length;
    this.criticalAlerts = open.filter(a => a.severity === 'critical' || a.severity === 'high').length;
    this.recentAlerts   = alerts.slice(0, 5);
    this.criticalAlertsList = open.filter(a => a.severity === 'critical').slice(0, 3);
    this.buildAlertsChart(alerts);
  }

  private applyServices(services: any[]): void {
    this.totalServices = services.length;
    this.services = services.slice(0, 6);
  }

  private applyAuditStats(s: AuditStats): void {
    this.totalAuditEvents = s.total;
    this.buildActivityChart(s.last7days);
  }

  private generateAiInsights(alerts: AlertDto[], patients: any[]): void {
    const insights: { icon: string; color: string; text: string }[] = [];
    const critical = alerts.filter(a => a.severity === 'critical' && a.status === 'open');
    if (critical.length > 0) {
      insights.push({ icon: 'alert-triangle', color: '#d63031',
        text: `${critical.length} critical alert(s) unresolved — immediate action required` });
    }
    const inactive = patients.filter((p: any) => p.isActive === false).length;
    if (inactive > 0) {
      insights.push({ icon: 'user-off', color: '#e17055',
        text: `${inactive} patient(s) with inactive account detected` });
    }
    if (this.totalAuditEvents > 100) {
      insights.push({ icon: 'activity', color: '#6c5ce7',
        text: `High activity: ${this.totalAuditEvents} events logged this month` });
    }
    if (this.totalNurses < 3) {
      insights.push({ icon: 'nurse', color: '#fdcb6e',
        text: `Low nursing staff (${this.totalNurses}) — risk of overload` });
    }
    if (insights.length === 0) {
      insights.push({ icon: 'circle-check', color: '#00b894',
        text: 'System stable — no anomalies detected' });
    }
    this.aiInsights = insights;
  }

  // ── Chart builders ────────────────────────────────────────────────

  private buildServiceStaffChart(staffData: any[], services: any[]): void {
    // Map serviceId → service name (use all services including those without isArchived)
    const nameMap = new Map(services.map((s: any) => [s._id?.toString(), s.name]));

    const items = staffData
      .map(d => ({
        name: nameMap.get(d.serviceId) || d.serviceId?.slice(-4) || 'Unknown',
        doctors:  d.doctorCount,
        nurses:   d.nurseCount,
        patients: d.patientCount,
      }))
      .sort((a, b) => (b.doctors + b.nurses + b.patients) - (a.doctors + a.nurses + a.patients))
      .slice(0, 8);

    this.serviceStaffChart = {
      series: [
        { name: this.translate.instant('PHYSICIANS'),  data: items.map(i => i.doctors)  },
        { name: this.translate.instant('NURSES'),      data: items.map(i => i.nurses)   },
        { name: this.translate.instant('PATIENTS'),    data: items.map(i => i.patients) },
      ],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, stacked: false },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '60%', grouped: true } },
      colors: ['#0984e3', '#00b894', '#e17055'],
      xaxis: { categories: items.map(i => i.name), labels: { style: { fontSize: '10px' }, rotate: -30 } },
      legend: { position: 'top', fontSize: '11px' },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 3 },
      tooltip: { theme: 'light', shared: true, intersect: false },
    };
  }

  private buildRemindersByCoordChart(reminders: any[]): void {
    const map: Record<string, number> = {};
    reminders.forEach(r => {
      const name = r.coordinatorName || 'Unknown';
      map[name] = (map[name] ?? 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    this.remindersByCoordChart = {
      series: [{ name: this.translate.instant('REMINDERS'), data: sorted.map(e => e[1]) }],
      chart: { type: 'bar', height: 220, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
      colors: ['#6c5ce7'],
      xaxis: { categories: sorted.map(e => e[0].split(' ')[0]), labels: { style: { fontSize: '10px' } } },
      dataLabels: { enabled: true, style: { fontSize: '10px' } },
      grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 3 },
      tooltip: { theme: 'light' },
    };
  }

  private buildRemindersByPatientChart(reminders: any[]): void {
    const map: Record<string, number> = {};
    reminders.forEach(r => {
      const name = r.patientName || 'Unknown';
      map[name] = (map[name] ?? 0) + 1;
    });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    this.remindersByPatientChart = {
      series: [{ name: this.translate.instant('REMINDERS'), data: sorted.map(e => e[1]) }],
      chart: { type: 'bar', height: 220, toolbar: { show: false } },
      plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: '55%' } },
      colors: ['#0984e3'],
      xaxis: { labels: { style: { fontSize: '10px' } } },
      yaxis: { categories: sorted.map(e => e[0].split(' ')[0]), labels: { style: { fontSize: '10px' } } },
      dataLabels: { enabled: true, style: { fontSize: '10px' } },
      grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 3 },
      tooltip: { theme: 'light' },
    };
  }

  private buildAlertsChart(alerts: AlertDto[]): void {
    const last7 = this.last7DayLabels();
    const counts = last7.map(d =>
      alerts.filter(a => a.createdAt?.startsWith(d)).length
    );
    this.alertsChart = {
      series: [{ name: this.translate.instant('ALERTS'), data: counts }],
      chart: { type: 'bar', height: 180, toolbar: { show: false }, sparkline: { enabled: false } },
      plotOptions: { bar: { borderRadius: 4, columnWidth: '50%' } },
      colors: ['#d63031'],
      xaxis: { categories: last7.map(d => d.slice(5)), labels: { style: { fontSize: '10px' } } },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 3 },
      tooltip: { theme: 'light' },
    };
  }

  private buildUsersRoleChart(roles: { role: string; count: number; color: string }[]): void {
    this.usersRoleChart = {
      series: roles.map(r => r.count),
      labels: roles.map(r => r.role),
      chart: { type: 'donut', height: 220 },
      colors: roles.map(r => r.color),
      legend: { position: 'bottom', fontSize: '11px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '60%' } } },
      tooltip: { theme: 'light' },
    };
  }

  private buildActivityChart(last7: { _id: string; count: number }[]): void {
    const days = this.last7DayLabels();
    const counts = days.map(d => last7.find(x => x._id === d)?.count ?? 0);
    this.activityChart = {
      series: [{ name: this.translate.instant('EVENTS'), data: counts }],
      chart: { type: 'area', height: 180, toolbar: { show: false } },
      stroke: { curve: 'smooth', width: 2 },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
      colors: ['#6c5ce7'],
      xaxis: { categories: days.map(d => d.slice(5)), labels: { style: { fontSize: '10px' } } },
      dataLabels: { enabled: false },
      grid: { borderColor: 'rgba(0,0,0,0.05)', strokeDashArray: 3 },
      tooltip: { theme: 'light' },
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────

  private last7DayLabels(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
  }

  loadServiceIntelligence(): void {
    this.intelLoading = true;
    this.http.get<any>(`${API_BASE_URL}/ai/service-intelligence`)
      .pipe(catchError(() => of(null)))
      .subscribe(data => { this.intel = data; this.intelLoading = false; });
  }

  logDisplayName(log: AuditLog): string {
    if (log.userName && log.userName !== 'anonymous' && log.userName !== log.userEmail) {
      return log.userName;
    }
    return log.userEmail || 'Inconnu';
  }

  logRoleColor(role: string): string {
    return ({
      'super-admin': '#6c5ce7', admin: '#0984e3', doctor: '#00b894',
      nurse: '#00cec9', coordinator: '#e17055', auditor: '#a29bfe', patient: '#fdcb6e',
    } as any)[role?.toLowerCase()] ?? '#b2bec3';
  }

  severityColor(s: string): string {
    return { critical: '#d63031', high: '#e17055', medium: '#fdcb6e', low: '#00b894' }[s] ?? '#b2bec3';
  }

  severityIcon(s: string): string {
    return { critical: 'alert-octagon', high: 'alert-triangle', medium: 'alert-circle', low: 'info-circle' }[s] ?? 'bell';
  }

  auditActionColor(a: string): string {
    return {
      CREATE:     '#00b894',
      UPDATE:     '#0984e3',
      DELETE:     '#d63031',
      LOGIN:      '#6c5ce7',
      VIEW:       '#b2bec3',
      ACTIVATE:   '#00cec9',
      DEACTIVATE: '#e17055',
      RESTORE:    '#fdcb6e',
      MARK_READ:  '#a29bfe',
    }[a] ?? '#b2bec3';
  }

  auditActionIcon(a: string): string {
    return {
      CREATE:     'circle-plus',
      UPDATE:     'edit',
      DELETE:     'trash',
      LOGIN:      'login',
      VIEW:       'eye',
      ACTIVATE:   'toggle-right',
      DEACTIVATE: 'toggle-left',
      RESTORE:    'restore',
      MARK_READ:  'check',
    }[a] ?? 'activity';
  }
}