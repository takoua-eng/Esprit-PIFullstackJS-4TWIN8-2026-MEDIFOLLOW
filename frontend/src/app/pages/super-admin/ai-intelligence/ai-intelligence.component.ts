import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';

interface ReportResult {
  type: string;
  report: { resume: string; problemes: string[]; causes: string[]; recommandations: string[] };
  data?: any;
  generatedAt: string;
}

interface StrokeRiskResult {
  patientId: string;
  patientName: string;
  prediction: {
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskColor: string;
    clusterLabel: string;
    recommendations: string[];
  };
  error?: string;
}

const REPORT_TYPES = [
  { key: 'monthly',      label: 'Rapport mensuel',    icon: 'calendar-stats',  color: '#0984e3', desc: 'Analyse globale du mois en cours' },
  { key: 'risk',         label: 'Patients à risque',  icon: 'alert-triangle',  color: '#d63031', desc: 'Identification des patients à surveiller' },
  { key: 'coordinators', label: 'Coordinateurs',      icon: 'users-group',     color: '#6c5ce7', desc: 'Performance et activité des coordinateurs' },
  { key: 'anomalies',    label: 'Anomalies',          icon: 'chart-bar',       color: '#e17055', desc: 'Patterns anormaux dans les données' },
];

@Component({
  selector: 'app-ai-intelligence',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './ai-intelligence.component.html',
  styleUrls: ['./ai-intelligence.component.scss'],
})
export class AiIntelligenceComponent implements OnInit {
  // ── AI Report ──────────────────────────────────────────────
  reportTypes = REPORT_TYPES;
  loading = false;
  activeType = '';
  result: ReportResult | null = null;
  history: ReportResult[] = [];

  // ── Stroke Risk ────────────────────────────────────────────
  activeTab: 'report' | 'stroke' = 'report';
  strokeLoading = false;
  strokeResults: StrokeRiskResult[] = [];
  selectedPatient: StrokeRiskResult | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  // ── AI Report methods ──────────────────────────────────────

  generate(type: string): void {
    this.loading = true;
    this.activeType = type;
    this.result = null;

    this.http.post<ReportResult>(`${API_BASE_URL}/ai/report`, { type })
      .pipe(catchError(() => of({
        type,
        report: { resume: 'Service AI indisponible.', problemes: [], causes: [], recommandations: [] },
        data: null,
        generatedAt: new Date().toISOString()
      } as ReportResult)))
      .subscribe(res => {
        this.result = res;
        this.history.unshift(res);
        if (this.history.length > 5) this.history.pop();
        this.loading = false;
      });
  }

  getTypeInfo(key: string) {
    return REPORT_TYPES.find(t => t.key === key) ?? REPORT_TYPES[0];
  }

  // ── Stroke Risk methods ────────────────────────────────────

  loadAllStrokeRisks(): void {
    this.strokeLoading = true;
    this.strokeResults = [];
    this.selectedPatient = null;

    this.http.get<StrokeRiskResult[]>(`${API_BASE_URL}/ai/stroke-risk-all`)
      .pipe(catchError(() => of([])))
      .subscribe(results => {
        this.strokeResults = results;
        this.strokeLoading = false;
      });
  }

  selectPatient(p: StrokeRiskResult): void {
    this.selectedPatient = p;
  }

  riskIcon(level: string): string {
    return { HIGH: 'alert-octagon', MEDIUM: 'alert-triangle', LOW: 'circle-check' }[level] ?? 'circle';
  }

  get highRiskCount():   number { return this.strokeResults.filter(r => r.prediction?.riskLevel === 'HIGH').length; }
  get mediumRiskCount(): number { return this.strokeResults.filter(r => r.prediction?.riskLevel === 'MEDIUM').length; }
  get lowRiskCount():    number { return this.strokeResults.filter(r => r.prediction?.riskLevel === 'LOW').length; }
}
