import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';

interface StrokeResult {
  patientId: string;
  patientName: string;
  mlInput?: any;
  prediction?: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskColor: string;
    clusterLabel: string;
    recommendations: string[];
  };
  error?: string;
}

@Component({
  selector: 'app-stroke-risk',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconsModule],
  templateUrl: './stroke-risk.component.html',
  styleUrls: ['./stroke-risk.component.scss'],
})
export class StrokeRiskComponent implements OnInit {
  results: StrokeResult[] = [];
  filtered: StrokeResult[] = [];
  loading = false;
  selected: StrokeResult | null = null;
  searchText = '';
  filterLevel: 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'ALL';

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.load(); }

  private getDoctorId(): string | null {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
      return payload.sub ?? null;
    } catch { return null; }
  }

  load(): void {
    this.loading = true;
    this.selected = null;

    const doctorId = this.getDoctorId();
    if (!doctorId) { this.loading = false; return; }

    // Get patients already filtered by doctor from backend
    this.http.get<any[]>(`${API_BASE_URL}/users/patients`).pipe(catchError(() => of([]))).subscribe(myPatients => {

      if (!myPatients.length) {
        this.results = []; this.filtered = []; this.loading = false;
        return;
      }

      // Predict stroke risk for each patient
      forkJoin(myPatients.map(p =>
        this.http.get<StrokeResult>(`${API_BASE_URL}/ai/stroke-risk/${p._id}`)
          .pipe(catchError(() => of({
            patientId: p._id,
            patientName: `${p.firstName} ${p.lastName}`,
            error: 'ML service indisponible',
          } as StrokeResult)))
      )).subscribe(results => {
        this.results = results.filter(r => r !== null) as StrokeResult[];
        this.applyFilters();
        this.loading = false;
      });
    });
  }

  applyFilters(): void {
    const s = this.searchText.toLowerCase();
    this.filtered = this.results.filter(r => {
      const matchText = !s || r.patientName.toLowerCase().includes(s);
      const matchLevel = this.filterLevel === 'ALL' || r.prediction?.riskLevel === this.filterLevel;
      return matchText && matchLevel;
    });
  }

  get highCount():   number { return this.results.filter(r => r.prediction?.riskLevel === 'HIGH').length; }
  get mediumCount(): number { return this.results.filter(r => r.prediction?.riskLevel === 'MEDIUM').length; }
  get lowCount():    number { return this.results.filter(r => r.prediction?.riskLevel === 'LOW').length; }

  levelColor(level: string): string {
    return ({ HIGH: '#d63031', MEDIUM: '#fdcb6e', LOW: '#00b894' } as any)[level] ?? '#b2bec3';
  }

  levelBg(level: string): string {
    return ({ HIGH: '#d6303115', MEDIUM: '#fdcb6e15', LOW: '#00b89415' } as any)[level] ?? '#f1f3f5';
  }
}
