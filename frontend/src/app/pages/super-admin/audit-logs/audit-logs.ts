import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { interval, Subscription, forkJoin } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { AuditApiService, AuditLog, AuditStats } from '../../../services/audit.service';
import { AuditDetailDialog } from './audit-detail-dialog';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule,
    MatIconModule, MatButtonModule, MatCardModule,
    MatTooltipModule, MatDialogModule, MatTabsModule, MatChipsModule,
    TablerIconComponent,
  ],
  templateUrl: './audit-logs.html',
  styleUrls: ['./audit-logs.scss'],
})
export class AuditLogsComponent implements OnInit, AfterViewInit, OnDestroy {

  displayedColumns = ['createdAt', 'user', 'action', 'entityType', 'description', 'entityId', 'ipAddress', 'status', 'risk', 'actions'];
  dataSource = new MatTableDataSource<AuditLog>([]);
  allLogs: AuditLog[] = [];
  lastRefresh = new Date();
  activeView: 'table' | 'timeline' = 'table';

  // Stats
  totalActions = 0;
  loginCount = 0;
  patientModifications = 0;
  alertsGenerated = 0;
  criticalChanges = 0;

  // Filters
  filterUser    = '';
  filterAction  = '';
  filterEntity  = '';
  filterSearch  = '';
  filterDateFrom: Date | null = null;
  filterDateTo:   Date | null = null;

  actions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW',
             'ACTIVATE', 'DEACTIVATE', 'ARCHIVE', 'RESTORE',
             'VERIFY', 'RESOLVE', 'ACKNOWLEDGE', 'SEND_REMINDER',
             'RESET_PASSWORD', 'QUESTIONNAIRE_SUBMIT'];

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if(ms) {
      this.sort = ms;
      this.dataSource.sort = this.sort;
    }
  }
  sort!: MatSort;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if(mp) {
      this.paginator = mp;
      this.dataSource.paginator = this.paginator;
    }
  }
  paginator!: MatPaginator;
  private pollSub?: Subscription;

  constructor(private auditService: AuditApiService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.pollSub = interval(15000).pipe(
      startWith(0),
      switchMap(() => forkJoin({
        logs:  this.auditService.getLogs(),
        stats: this.auditService.getStats(),
      })),
    ).subscribe({
      next: ({ logs, stats }) => {
        this.allLogs = logs;
        this.lastRefresh = new Date();
        this.totalActions         = stats.totalLast7days ?? 0;
        this.loginCount           = stats.loginCount ?? 0;
        this.patientModifications = stats.patientModifications ?? 0;
        this.alertsGenerated      = stats.alertsGenerated ?? 0;
        this.criticalChanges      = stats.criticalChanges ?? 0;
        this.applyFilters();
      },
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }

  applyFilters(): void {
    let filtered = [...this.allLogs];
    const search = this.filterSearch.toLowerCase();
    if (search) {
      filtered = filtered.filter(l =>
        l.userEmail?.toLowerCase().includes(search) ||
        l.userName?.toLowerCase().includes(search) ||
        l.action?.toLowerCase().includes(search) ||
        l.entityType?.toLowerCase().includes(search) ||
        l.entityId?.toLowerCase().includes(search)
      );
    }
    if (this.filterUser)   filtered = filtered.filter(l => l.userEmail?.toLowerCase().includes(this.filterUser.toLowerCase()) || l.userName?.toLowerCase().includes(this.filterUser.toLowerCase()));
    if (this.filterAction) filtered = filtered.filter(l => l.action === this.filterAction);
    if (this.filterEntity) filtered = filtered.filter(l => l.entityType?.toLowerCase().includes(this.filterEntity.toLowerCase()));
    if (this.filterDateFrom) filtered = filtered.filter(l => new Date(l.createdAt) >= this.filterDateFrom!);
    if (this.filterDateTo)   filtered = filtered.filter(l => new Date(l.createdAt) <= this.filterDateTo!);
    this.dataSource.data = filtered;
    this.dataSource.paginator?.firstPage();
  }

  clearFilters(): void {
    this.filterUser = ''; this.filterAction = ''; this.filterEntity = '';
    this.filterSearch = ''; this.filterDateFrom = null; this.filterDateTo = null;
    this.applyFilters();
  }

  refresh(): void {
    forkJoin({ logs: this.auditService.getLogs(), stats: this.auditService.getStats() })
      .subscribe(({ logs, stats }) => {
        this.allLogs = logs;
        this.lastRefresh = new Date();
        this.totalActions         = stats.totalLast7days ?? 0;
        this.loginCount           = stats.loginCount ?? 0;
        this.patientModifications = stats.patientModifications ?? 0;
        this.alertsGenerated      = stats.alertsGenerated ?? 0;
        this.criticalChanges      = stats.criticalChanges ?? 0;
        this.applyFilters();
      });
  }

  viewDetail(log: AuditLog): void {
    this.dialog.open(AuditDetailDialog, { width: '720px', maxWidth: '95vw', data: log });
  }

  deleteLog(log: AuditLog): void {
    if (!confirm('Supprimer ce log ?')) return;
    this.auditService.deleteLog(log._id).subscribe(() => this.refresh());
  }

  // Timeline: group logs by date
  get timelineGroups(): { date: string; logs: AuditLog[] }[] {
    const map = new Map<string, AuditLog[]>();
    this.dataSource.data.slice(0, 50).forEach(log => {
      const d = new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(log);
    });
    return Array.from(map.entries()).map(([date, logs]) => ({ date, logs }));
  }

  displayName(log: AuditLog): string {
    if (log.userName && log.userName !== 'anonymous' && log.userName !== log.userEmail) {
      return log.userName;
    }
    return log.userEmail || 'Inconnu';
  }

  roleColor(role: string): string {
    return ({ 'super-admin':'#6c5ce7', admin:'#0984e3', doctor:'#00b894',
              nurse:'#00cec9', coordinator:'#e17055', auditor:'#fdcb6e', patient:'#a29bfe' } as any)[role?.toLowerCase()] ?? '#b2bec3';
  }

  formatIp(ip: string): string {
    if (!ip || ip === 'unknown') return '—';
    if (ip === '::1' || ip === '127.0.0.1') return 'localhost';
    if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
    return ip;
  }

  riskColor(r: string): string {
    return ({ CRITICAL: '#d63031', SUSPICIOUS: '#e17055', NORMAL: '#00b894' } as any)[r] ?? '#b2bec3';
  }

  riskIcon(r: string): string {
    return ({ CRITICAL: 'alert-octagon', SUSPICIOUS: 'alert-triangle', NORMAL: 'circle-check' } as any)[r] ?? 'circle';
  }

  actionColor(a: string): string {
    return ({ CREATE:'#00b894', UPDATE:'#0984e3', DELETE:'#d63031', LOGIN:'#6c5ce7',
              LOGOUT:'#a29bfe', VIEW:'#b2bec3', ACTIVATE:'#00cec9', DEACTIVATE:'#e17055',
              ARCHIVE:'#636e72', RESTORE:'#fdcb6e', VERIFY:'#00b894', RESOLVE:'#00b894',
              ACKNOWLEDGE:'#0984e3', SEND_REMINDER:'#e17055', RESET_PASSWORD:'#d63031' } as any)[a] ?? '#636e72';
  }

  actionIcon(a: string): string {
    return ({ CREATE:'circle-plus', UPDATE:'edit', DELETE:'trash', LOGIN:'login',
              LOGOUT:'logout', VIEW:'eye', ACTIVATE:'toggle-right', DEACTIVATE:'toggle-left',
              ARCHIVE:'archive', RESTORE:'restore', VERIFY:'shield-check', RESOLVE:'circle-check',
              ACKNOWLEDGE:'check', SEND_REMINDER:'bell', RESET_PASSWORD:'key' } as any)[a] ?? 'activity';
  }
}
