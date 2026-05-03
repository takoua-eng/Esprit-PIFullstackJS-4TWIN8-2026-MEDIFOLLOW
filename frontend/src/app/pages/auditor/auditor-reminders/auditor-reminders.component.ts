import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';

interface ReminderRow {
  _id: string;
  createdAt: string;
  scheduledAt: string;
  sentAt: string;
  patientName: string;
  patientEmail: string;
  coordinatorName: string;
  type: string;
  message: string;
  status: string;
  emailSent: boolean;
  smsSent: boolean;
}

interface Stats {
  total: number;
  sentCount: number;
  scheduledCount: number;
  cancelledCount: number;
  successRate: number;
  avgDelayMin: number | null;
}

@Component({
  selector: 'app-auditor-reminders',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconComponent],
  templateUrl: './auditor-reminders.component.html',
  styleUrls: ['./auditor-reminders.component.scss'],
})
export class AuditorRemindersComponent implements OnInit, AfterViewInit {
  displayedColumns = ['createdAt', 'patientName', 'coordinatorName', 'type', 'message', 'status', 'channels'];
  dataSource = new MatTableDataSource<ReminderRow>([]);
  loading = false;

  stats: Stats = { total: 0, sentCount: 0, scheduledCount: 0, cancelledCount: 0, successRate: 0, avgDelayMin: null };

  filterStatus = 'all';
  statuses = ['all', 'sent', 'scheduled', 'cancelled'];
  searchText = '';

  private allRows: ReminderRow[] = [];

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

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filterPredicate = (row) => this.matchRow(row);
  }

  load(): void {
    this.loading = true;
    this.http.get<{ stats: Stats; reminders: ReminderRow[] }>(
      `${API_BASE_URL}/coordinator/auditor/reminders-overview`
    ).pipe(catchError(() => of({ stats: this.stats, reminders: [] })))
     .subscribe(({ stats, reminders }) => {
       this.stats = stats;
       this.allRows = reminders;
       this.applyFilters();
       this.loading = false;
     });
  }

  private matchRow(row: ReminderRow): boolean {
    const s = this.searchText.toLowerCase();
    const matchSearch = !s ||
      row.patientName.toLowerCase().includes(s) ||
      row.coordinatorName.toLowerCase().includes(s) ||
      row.message?.toLowerCase().includes(s);
    const matchStatus = this.filterStatus === 'all' || row.status === this.filterStatus;
    return matchSearch && matchStatus;
  }

  applyFilters(): void {
    this.dataSource.data = this.allRows;
    this.dataSource.filter = Date.now().toString();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onSearch(e: Event): void {
    this.searchText = (e.target as HTMLInputElement).value;
    this.applyFilters();
  }

  statusColor(s: string): string {
    return ({ sent: '#00b894', scheduled: '#0984e3', cancelled: '#d63031' } as any)[s] ?? '#b2bec3';
  }

  delayLabel(min: number | null): string {
    if (min === null) return '—';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }
}