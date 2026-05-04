﻿import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';

interface AnomalyRow {
  patientId: string;
  name: string;
  email: string;
  mrn: string;
  service: string;
  coordinatorName: string;
  vitalsToday: boolean;
  symptomsToday: boolean;
  issue: string;
  severity: 'HIGH' | 'MEDIUM';
}

@Component({
  selector: 'app-auditor-anomalies',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconComponent],
  templateUrl: './auditor-anomalies.component.html',
  styleUrls: ['./auditor-anomalies.component.scss'],
})
export class AuditorAnomaliesComponent implements OnInit {
  allAnomalies: AnomalyRow[] = [];
  filtered: AnomalyRow[] = [];
  loading = false;
  lastRefresh = new Date();

  filterSeverity: 'ALL' | 'HIGH' | 'MEDIUM' = 'ALL';
  searchText = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.http.get<any[]>(`${API_BASE_URL}/coordinator/auditor/patients-overview`)
      .pipe(catchError(() => of([])))
      .subscribe(patients => {
        this.lastRefresh = new Date();

        const rows: AnomalyRow[] = [];

        for (const p of patients) {
          if (p.status === 'OK') continue; // pas d'anomalie

          const severity: 'HIGH' | 'MEDIUM' = p.status === 'NO DATA' ? 'HIGH' : 'MEDIUM';

          let issue = '';
          if (!p.vitalsToday && !p.symptomsToday) {
            issue = 'Aucune soumission de vitaux ni de symptômes aujourd\'hui';
          } else if (!p.vitalsToday) {
            issue = 'Signes vitaux manquants aujourd\'hui';
          } else {
            issue = 'Rapport de symptômes manquant aujourd\'hui';
          }

          rows.push({
            patientId:       p._id,
            name:            p.name,
            email:           p.email,
            mrn:             p.mrn || 'â€”',
            service:         p.service || p.department || 'â€”',
            coordinatorName: p.coordinatorName || 'â€”',
            vitalsToday:     p.vitalsToday,
            symptomsToday:   p.symptomsToday,
            issue,
            severity,
          });
        }

        // Sort: HIGH first
        this.allAnomalies = rows.sort((a, b) => a.severity === 'HIGH' ? -1 : 1);
        this.applyFilters();
        this.loading = false;
      });
  }

  applyFilters(): void {
    const s = this.searchText.toLowerCase();
    this.filtered = this.allAnomalies.filter(a => {
      const matchSev  = this.filterSeverity === 'ALL' || a.severity === this.filterSeverity;
      const matchText = !s || a.name.toLowerCase().includes(s) || a.email.toLowerCase().includes(s) || a.mrn.toLowerCase().includes(s);
      return matchSev && matchText;
    });
  }

  onSearch(e: Event): void {
    this.searchText = (e.target as HTMLInputElement).value;
    this.applyFilters();
  }

  severityColor(s: string): string {
    return s === 'HIGH' ? '#d63031' : '#fdcb6e';
  }

  get highCount():   number { return this.allAnomalies.filter(a => a.severity === 'HIGH').length; }
  get mediumCount(): number { return this.allAnomalies.filter(a => a.severity === 'MEDIUM').length; }
}
