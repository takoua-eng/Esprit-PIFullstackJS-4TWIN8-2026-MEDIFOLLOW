import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AuditApiService, AuditLog } from 'src/app/services/audit.service';
import { interval, Subscription, forkJoin } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';
import { AuditorLogDetailDialog } from './auditor-log-detail.dialog';
import { AuditorReportDialog } from './auditor-report.dialog';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/api.config';

type AuditRow = AuditLog & { verified?: boolean };

@Component({
  selector: 'app-auditor-verify',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconsModule,
            MatNativeDateModule, MatDatepickerModule],
  templateUrl: './auditor-verify.component.html',
  styleUrls: ['./auditor-verify.component.scss'],
})
export class AuditorVerifyComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns = ['createdAt', 'user', 'action', 'entityType', 'entityId', 'ipAddress', 'status', 'actions'];
  dataSource = new MatTableDataSource<AuditRow>([]);
  allLogs: AuditRow[] = [];
  loading = false;
  lastRefresh = new Date();
  activeView: 'table' | 'timeline' = 'table';

  // Stats
  totalLogs = 0;
  criticalCount = 0;
  loginCount = 0;

  // Filters
  filterSearch   = '';
  filterAction   = '';
  filterEntity   = '';
  filterDateFrom: Date | null = null;
  filterDateTo:   Date | null = null;

  actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW',
             'ACTIVATE', 'DEACTIVATE', 'ARCHIVE', 'RESTORE',
             'SEND_REMINDER', 'RESET_PASSWORD', 'QUESTIONNAIRE_SUBMIT'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  private pollSub?: Subscription;

  constructor(private auditService: AuditApiService, private dialog: MatDialog, private http: HttpClient) {}

  ngOnInit(): void {
    this.pollSub = interval(20000).pipe(
      startWith(0),
      switchMap(() => forkJoin({
        logs:  this.auditService.getLogs(),
        stats: this.auditService.getStats(),
      }))
    ).subscribe({
      next: ({ logs, stats }) => {
        // preserve verified state
        const verifiedIds = new Set(this.allLogs.filter(r => r.verified).map(r => r._id));
        this.allLogs = (logs as AuditLog[]).map(l => ({ ...l, verified: verifiedIds.has(l._id) }));
        this.lastRefresh = new Date();
        this.totalLogs    = stats.totalLast7days ?? 0;
        this.criticalCount = stats.criticalChanges ?? 0;
        this.loginCount   = stats.loginCount ?? 0;
        this.applyFilters();
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  // ── Report Generation ─────────────────────────────────────
  reportLoading: 'daily' | 'monthly' | 'suspicious' | null = null;

  generateReport(type: 'daily' | 'monthly' | 'suspicious'): void {
    this.reportLoading = type;
    const endpoint = `${API_BASE_URL}/ai/audit-report/${type}`;
    this.http.post<any>(endpoint, {}).subscribe({
      next: (res) => {
        this.reportLoading = null;
        this.dialog.open(AuditorReportDialog, {
          width: '780px', maxWidth: '96vw',
          data: { ...res, type },
        });
      },
      error: () => { this.reportLoading = null; },
    });
  }

  applyFilters(): void {
    let filtered = [...this.allLogs];
    const s = this.filterSearch.toLowerCase();
    if (s) filtered = filtered.filter(l =>
      l.userEmail?.toLowerCase().includes(s) ||
      l.userName?.toLowerCase().includes(s) ||
      l.action?.toLowerCase().includes(s) ||
      l.entityType?.toLowerCase().includes(s) ||
      l.entityId?.toLowerCase().includes(s)
    );
    if (this.filterAction) filtered = filtered.filter(l => l.action === this.filterAction);
    if (this.filterEntity) filtered = filtered.filter(l => l.entityType?.toLowerCase().includes(this.filterEntity.toLowerCase()));
    if (this.filterDateFrom) filtered = filtered.filter(l => new Date(l.createdAt) >= this.filterDateFrom!);
    if (this.filterDateTo)   filtered = filtered.filter(l => new Date(l.createdAt) <= this.filterDateTo!);
    this.dataSource.data = filtered;
    this.dataSource.paginator?.firstPage();
  }

  clearFilters(): void {
    this.filterSearch = ''; this.filterAction = ''; this.filterEntity = '';
    this.filterDateFrom = null; this.filterDateTo = null;
    this.applyFilters();
  }

  refresh(): void {
    forkJoin({ logs: this.auditService.getLogs(), stats: this.auditService.getStats() })
      .subscribe(({ logs, stats }) => {
        const verifiedIds = new Set(this.allLogs.filter(r => r.verified).map(r => r._id));
        this.allLogs = (logs as AuditLog[]).map(l => ({ ...l, verified: verifiedIds.has(l._id) }));
        this.lastRefresh = new Date();
        this.totalLogs     = stats.totalLast7days ?? 0;
        this.criticalCount = stats.criticalChanges ?? 0;
        this.loginCount    = stats.loginCount ?? 0;
        this.applyFilters();
      });
  }

  formatIp(ip: string): string {
    if (!ip || ip === 'unknown') return '—';
    if (ip === '::1' || ip === '127.0.0.1') return 'localhost';
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
  }

  verify(row: AuditRow): void   { row.verified = true;  this.dataSource.data = [...this.dataSource.data]; }
  unverify(row: AuditRow): void { row.verified = false; this.dataSource.data = [...this.dataSource.data]; }
  verifyAll(): void { this.dataSource.data.forEach(r => r.verified = true); this.dataSource.data = [...this.dataSource.data]; }

  viewDetail(log: AuditRow): void {
    this.dialog.open(AuditorLogDetailDialog, { width: '720px', maxWidth: '95vw', data: log });
  }

  get verifiedCount(): number { return this.dataSource.data.filter(r => r.verified).length; }
  get pendingCount():  number { return this.dataSource.data.filter(r => !r.verified).length; }

  // Timeline grouping
  get timelineGroups(): { date: string; logs: AuditRow[] }[] {
    const map = new Map<string, AuditRow[]>();
    this.dataSource.data.slice(0, 50).forEach(log => {
      const d = new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(log);
    });
    return Array.from(map.entries()).map(([date, logs]) => ({ date, logs }));
  }

  displayName(log: AuditLog): string {
    if (log.userName && log.userName !== 'anonymous' && log.userName !== log.userEmail) return log.userName;
    return log.userEmail || 'Inconnu';
  }

  roleColor(role: string): string {
    return ({ 'super-admin':'#6c5ce7', admin:'#0984e3', doctor:'#00b894',
              nurse:'#00cec9', coordinator:'#e17055', auditor:'#a29bfe', patient:'#fdcb6e' } as any)[role?.toLowerCase()] ?? '#b2bec3';
  }

  actionColor(a: string): string {
    return ({ CREATE:'#00b894', UPDATE:'#0984e3', DELETE:'#d63031', LOGIN:'#6c5ce7',
              LOGOUT:'#a29bfe', VIEW:'#b2bec3', ACTIVATE:'#00cec9', DEACTIVATE:'#e17055',
              ARCHIVE:'#636e72', RESTORE:'#fdcb6e', SEND_REMINDER:'#e17055', RESET_PASSWORD:'#d63031' } as any)[a] ?? '#636e72';
  }

  actionIcon(a: string): string {
    return ({ CREATE:'circle-plus', UPDATE:'edit', DELETE:'trash', LOGIN:'login',
              LOGOUT:'logout', VIEW:'eye', ACTIVATE:'toggle-right', DEACTIVATE:'toggle-left',
              ARCHIVE:'archive', RESTORE:'restore', SEND_REMINDER:'bell', RESET_PASSWORD:'key' } as any)[a] ?? 'activity';
  }
}
