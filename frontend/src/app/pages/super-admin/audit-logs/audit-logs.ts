import { Component, OnInit, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
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
import { TablerIconsModule } from 'angular-tabler-icons';
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
    MatTooltipModule, MatDialogModule, TablerIconsModule,
  ],
  templateUrl: './audit-logs.html',
  styleUrls: ['./audit-logs.scss'],
})
export class AuditLogsComponent implements OnInit, AfterViewInit, OnDestroy {
  displayedColumns = ['createdAt', 'userEmail', 'action', 'entityType', 'entityId', 'ipAddress', 'actions'];
  dataSource = new MatTableDataSource<AuditLog>([]);
  allLogs: AuditLog[] = [];
  lastRefresh = new Date();

  // Stats
  stats: AuditStats | null = null;
  totalActions = 0;
  loginCount = 0;
  patientModifications = 0;
  alertsGenerated = 0;
  criticalChanges = 0;

  // Filters
  filterUser    = '';
  filterAction  = '';
  filterEntity  = '';
  filterDateFrom: Date | null = null;
  filterDateTo:   Date | null = null;

  actions = ['', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW',
             'ACTIVATE', 'DEACTIVATE', 'ARCHIVE', 'RESTORE',
             'VERIFY', 'RESOLVE', 'ACKNOWLEDGE', 'SEND_REMINDER',
             'RESET_PASSWORD', 'QUESTIONNAIRE_SUBMIT'];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
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
        // Use backend pre-computed stats
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

  private computeStats(logs: AuditLog[]): void {
    // Use backend pre-computed stats if available via getStats()
    // Fallback: compute from logs client-side
    const week = Date.now() - 7 * 24 * 3600 * 1000;
    const recent = logs.filter(l => new Date(l.createdAt).getTime() > week);
    this.totalActions         = recent.length;
    this.loginCount           = recent.filter(l => l.action === 'LOGIN').length;
    this.patientModifications = recent.filter(l =>
      (l.action === 'CREATE' || l.action === 'UPDATE') && l.entityType?.includes('PATIENT')
    ).length;
    this.alertsGenerated      = recent.filter(l => l.entityType?.includes('ALERT')).length;
    this.criticalChanges      = recent.filter(l =>
      l.action === 'DELETE' || l.action === 'ARCHIVE' ||
      l.action === 'DEACTIVATE' || l.action === 'RESET_PASSWORD' ||
      l.action === 'FORGOT_PASSWORD' ||
      (l.action === 'UPDATE' && l.entityType?.includes('ROLE'))
    ).length;
  }

  applyFilters(): void {
    let filtered = [...this.allLogs];
    if (this.filterUser)   filtered = filtered.filter(l => l.userEmail?.toLowerCase().includes(this.filterUser.toLowerCase()));
    if (this.filterAction) filtered = filtered.filter(l => l.action === this.filterAction);
    if (this.filterEntity) filtered = filtered.filter(l => l.entityType?.toLowerCase().includes(this.filterEntity.toLowerCase()));
    if (this.filterDateFrom) filtered = filtered.filter(l => new Date(l.createdAt) >= this.filterDateFrom!);
    if (this.filterDateTo)   filtered = filtered.filter(l => new Date(l.createdAt) <= this.filterDateTo!);
    this.dataSource.data = filtered;
    this.dataSource.paginator?.firstPage();
  }

  clearFilters(): void {
    this.filterUser = ''; this.filterAction = ''; this.filterEntity = '';
    this.filterDateFrom = null; this.filterDateTo = null;
    this.applyFilters();
  }

  refresh(): void {
    this.auditService.getLogs().subscribe(logs => {
      this.allLogs = logs;
      this.lastRefresh = new Date();
      this.computeStats(logs);
      this.applyFilters();
    });
  }

  viewDetail(log: AuditLog): void {
    this.dialog.open(AuditDetailDialog, { width: '700px', maxWidth: '95vw', data: log });
  }

  deleteLog(log: AuditLog): void {
    if (!confirm('Delete this log entry?')) return;
    this.auditService.deleteLog(log._id).subscribe(() => this.refresh());
  }

  actionColor(a: string): string {
    return {
      CREATE:'#00b894', UPDATE:'#0984e3', DELETE:'#d63031', LOGIN:'#6c5ce7',
      LOGOUT:'#a29bfe', VIEW:'#0984e3', ACTIVATE:'#00cec9', DEACTIVATE:'#e17055',
      ARCHIVE:'#636e72', RESTORE:'#fdcb6e', VERIFY:'#00b894', RESOLVE:'#00b894',
      ACKNOWLEDGE:'#0984e3', SEND_REMINDER:'#e17055', RESET_PASSWORD:'#d63031',
    }[a] ?? '#636e72';
  }

  actionIcon(a: string): string {
    return {
      CREATE:'circle-plus', UPDATE:'edit', DELETE:'trash', LOGIN:'login',
      LOGOUT:'logout', VIEW:'eye', ACTIVATE:'toggle-right', DEACTIVATE:'toggle-left',
      ARCHIVE:'archive', RESTORE:'restore', VERIFY:'shield-check', RESOLVE:'circle-check',
      ACKNOWLEDGE:'check', SEND_REMINDER:'bell', RESET_PASSWORD:'key',
    }[a] ?? 'activity';
  }
}
