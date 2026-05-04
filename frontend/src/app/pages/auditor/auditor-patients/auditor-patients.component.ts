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

interface PatientRow {
  _id: string;
  name: string;
  email: string;
  mrn: string;
  department: string;
  service: string;
  coordinatorName: string;
  vitalsToday: boolean;
  symptomsToday: boolean;
  status: 'OK' | 'INCOMPLETE' | 'NO DATA';
}

@Component({
  selector: 'app-auditor-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconComponent],
  templateUrl: './auditor-patients.component.html',
  styleUrls: ['./auditor-patients.component.scss'],
})
export class AuditorPatientsComponent implements OnInit, AfterViewInit {
  displayedColumns = ['name', 'mrn', 'service', 'coordinator', 'vitals', 'symptoms', 'status'];
  dataSource = new MatTableDataSource<PatientRow>([]);
  loading = false;

  // Filters
  searchText = '';
  filterStatus: 'ALL' | 'OK' | 'INCOMPLETE' | 'NO DATA' = 'ALL';
  filterService = 'ALL';
  services: string[] = [];

  private allRows: PatientRow[] = [];

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
    this.dataSource.filterPredicate = (row, _) => this.matchRow(row);
  }

  load(): void {
    this.loading = true;
    this.http.get<PatientRow[]>(`${API_BASE_URL}/coordinator/auditor/patients-overview`)
      .pipe(catchError(() => of([])))
      .subscribe(rows => {
        this.allRows = rows;
        // Build service list
        const svcSet = new Set(rows.map(r => r.service || r.department).filter(Boolean));
        this.services = Array.from(svcSet).sort();
        this.applyFilters();
        this.loading = false;
      });
  }

  private matchRow(row: PatientRow): boolean {
    const search = this.searchText.toLowerCase();
    const matchSearch = !search ||
      row.name.toLowerCase().includes(search) ||
      row.mrn.toLowerCase().includes(search) ||
      row.email.toLowerCase().includes(search);

    const matchStatus = this.filterStatus === 'ALL' || row.status === this.filterStatus;

    const rowService = row.service || row.department;
    const matchService = this.filterService === 'ALL' || rowService === this.filterService;

    return matchSearch && matchStatus && matchService;
  }

  applyFilters(): void {
    this.dataSource.data = this.allRows;
    // Trigger filterPredicate by setting a dummy filter value
    this.dataSource.filter = Date.now().toString();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  onSearch(e: Event): void {
    this.searchText = (e.target as HTMLInputElement).value;
    this.applyFilters();
  }

  statusColor(s: string): string {
    return ({ OK: '#00b894', INCOMPLETE: '#fdcb6e', 'NO DATA': '#d63031' } as any)[s] ?? '#b2bec3';
  }

  get okCount():         number { return this.allRows.filter(r => r.status === 'OK').length; }
  get incompleteCount(): number { return this.allRows.filter(r => r.status === 'INCOMPLETE').length; }
  get noDataCount():     number { return this.allRows.filter(r => r.status === 'NO DATA').length; }
}
