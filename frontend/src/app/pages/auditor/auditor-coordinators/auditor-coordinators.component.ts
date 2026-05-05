import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';

interface CoordPerf {
  rank: number;
  _id: string;
  name: string;
  email: string;
  patientCount: number;
  completenessRate: number;
  remindersSent: number;
  remindersToday: number;
  avgResponseMin: number | null;
}

@Component({
  selector: 'app-auditor-coordinators',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent],
  templateUrl: './auditor-coordinators.component.html',
  styleUrls: ['./auditor-coordinators.component.scss'],
})
export class AuditorCoordinatorsComponent implements OnInit, AfterViewInit {
  displayedColumns = ['rank', 'name', 'email', 'patientCount', 'completenessRate', 'remindersSent', 'remindersToday', 'avgResponseMin'];
  dataSource = new MatTableDataSource<CoordPerf>([]);
  loading = false;

  // KPI summary
  totalCoordinators = 0;
  avgPatients = 0;
  avgCompleteness = 0;
  totalRemindersToday = 0;

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
  }

  load(): void {
    this.loading = true;
    this.http.get<CoordPerf[]>(`${API_BASE_URL}/coordinator/all/performance`)
      .pipe(catchError(() => of([])))
      .subscribe(rows => {
        this.dataSource.data = rows;
        this.totalCoordinators = rows.length;
        this.avgPatients = rows.length
          ? Math.round(rows.reduce((s, r) => s + r.patientCount, 0) / rows.length)
          : 0;
        this.avgCompleteness = rows.length
          ? Math.round(rows.reduce((s, r) => s + r.completenessRate, 0) / rows.length)
          : 0;
        this.totalRemindersToday = rows.reduce((s, r) => s + r.remindersToday, 0);
        this.loading = false;
      });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim().toLowerCase();
  }

  completenessColor(rate: number): string {
    if (rate >= 80) return '#00b894';
    if (rate >= 50) return '#fdcb6e';
    return '#d63031';
  }

  responseLabel(min: number | null): string {
    if (min === null) return '\u2014';
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  }

  rankIcon(rank: number): string {
    return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  }
}

