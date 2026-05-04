?import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { API_BASE_URL } from 'src/app/core/api.config';
import { AuthSessionService } from 'src/app/services/auth-session.service';

@Component({
  selector: 'app-stroke-risk',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconComponent],
  templateUrl: './stroke-risk.component.html',
  styleUrls: ['./stroke-risk.component.scss'],
})
export class StrokeRiskComponent implements OnInit {

  results: any[] = [];
  filtered: any[] = [];
  selected: any;
  loading = false;

  searchText = '';
  filterLevel: any = 'ALL';

  constructor(private http: HttpClient, private authSession: AuthSessionService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.results = [];
    this.filtered = [];

    const user = this.authSession.getUser();
    const doctorId = user?._id || user?.id || '';
    const url = doctorId
      ? `${API_BASE_URL}/ai/stroke-risk-all?doctorId=${doctorId}`
      : `${API_BASE_URL}/ai/stroke-risk-all`;

    this.http.get<any[]>(url).pipe(
      catchError(() => of([]))
    ).subscribe(res => {
      this.results = res ?? [];
      this.applyFilters();
      this.loading = false;
    });
  }

  // ðŸ”¥ IMPORTANT FIX NORMALIZATION
  getLevel(r: any): string {
    const level = r?.prediction?.riskLevel;
    if (!level) return 'LOW';
    return level.toUpperCase();
  }

  getLabel(level: string): string {
    switch (level) {
      case 'HIGH': return 'Profil Ã  risque élevé';
      case 'MEDIUM': return 'Risque modéré';
      default: return 'Faible risque';
    }
  }

  levelColor(level: string): string {
    return {
      HIGH: '#d63031',
      MEDIUM: '#fdcb6e',
      LOW: '#00b894'
    }[level] || '#b2bec3';
  }

  levelBg(level: string): string {
    return {
      HIGH: '#d6303115',
      MEDIUM: '#fdcb6e15',
      LOW: '#00b89415'
    }[level] || '#eee';
  }

  applyFilters() {
    const s = this.searchText.toLowerCase();

    this.filtered = this.results.filter(r => {

      const level = this.getLevel(r);

      const matchText = !s || r.patientName?.toLowerCase().includes(s);
      const matchLevel = this.filterLevel === 'ALL' || level === this.filterLevel;

      return matchText && matchLevel;
    });
  }

  get highCount() {
    return this.results.filter(r => this.getLevel(r) === 'HIGH').length;
  }

  get mediumCount() {
    return this.results.filter(r => this.getLevel(r) === 'MEDIUM').length;
  }

  get lowCount() {
    return this.results.filter(r => this.getLevel(r) === 'LOW').length;
  }
}