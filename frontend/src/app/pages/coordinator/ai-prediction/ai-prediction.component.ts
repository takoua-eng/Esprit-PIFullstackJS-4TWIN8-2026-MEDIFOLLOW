?import { Component, OnInit, inject } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { CoordinatorService } from 'src/app/services/coordinator.service';
import { CoreService } from 'src/app/services/core.service';

export interface PatientPrediction {
  patientId: string; name: string; email: string; department: string;
  complianceRate: number; consecutiveMissingDays: number; lastSubmission: string | null;
  totalVitalSubmissions: number; totalSymptomSubmissions: number;
  riskScore: number; riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  vitalDaysCount: number; symptomDaysCount: number;
}

export interface PredictionResponse {
  generatedAt: string; periodDays: number; patients: PatientPrediction[];
}

export interface BriefingData {
  situationSummary: string;
  overallStatus: 'CRITICAL' | 'WARNING' | 'STABLE';
  priorityPatients: { name: string; reason: string; urgency: 'HIGH' | 'MEDIUM' }[];
  recommendedActions: { patient: string; action: string; icon: string }[];
  positiveNote: string;
}

@Component({
  selector: 'app-ai-prediction',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent, TranslateModule],
  templateUrl: './ai-prediction.component.html',
  styleUrls: ['./ai-prediction.component.scss'],
})
export class AiPredictionComponent implements OnInit {
  private http = inject(HttpClient);
  private coordinatorService = inject(CoordinatorService);
  private coreService = inject(CoreService);

  coordinatorId = '';

  prediction: PredictionResponse | null = null;
  loading = true;
  loadingAi = false;
  briefing: BriefingData | null = null;
  aiError = '';
  selectedPatient: PatientPrediction | null = null;

  todayFormatted = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });

  ngOnInit(): void {
    // Lire l'ID depuis le JWT stock� dans localStorage
const token = localStorage.getItem('accessToken');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.coordinatorId = payload.sub || '';
  } catch { }
}

// Fallback sur CoreService
if (!this.coordinatorId) {
  const user = this.coreService.currentUser();
  this.coordinatorId = user?._id || '';
}

    if (!this.coordinatorId) { console.error('No coordinator ID'); this.loading = false; return; }
    this.loadPrediction();
  }

  loadPrediction(): void {
    this.loading = true;
    this.http.get<PredictionResponse>(`${environment.apiUrl}/coordinator/${this.coordinatorId}/prediction`).subscribe({
      next: (data) => { this.prediction = data; this.loading = false; this.runAiAnalysis(); },
      error: (err) => { console.error('Prediction error', err); this.loading = false; },
    });
  }

  runAiAnalysis(): void {
    if (!this.prediction) return;
    this.loadingAi = true;
    this.briefing = null;
    this.aiError = '';

    const highRisk = this.prediction.patients.filter(p => p.riskLevel === 'HIGH');
    const mediumRisk = this.prediction.patients.filter(p => p.riskLevel === 'MEDIUM');
    const lowRisk = this.prediction.patients.filter(p => p.riskLevel === 'LOW');

    const prompt = `You are a medical coordinator assistant. Analyze this patient compliance data and return ONLY a valid JSON object (no markdown, no explanation, just raw JSON).

PATIENT DATA (last ${this.prediction.periodDays} days):
${this.prediction.patients.map(p =>
  `- ${p.name} (${p.department}): Risk=${p.riskLevel}, Compliance=${p.complianceRate}%, Missing=${p.consecutiveMissingDays} consecutive days, Vitals=${p.totalVitalSubmissions} submissions, Symptoms=${p.totalSymptomSubmissions} submissions${p.lastSubmission ? ', Last=' + new Date(p.lastSubmission).toLocaleDateString() : ', Never submitted'}`
).join('\n')}

HIGH RISK (${highRisk.length}): ${highRisk.map(p => p.name).join(', ') || 'None'}
MEDIUM RISK (${mediumRisk.length}): ${mediumRisk.map(p => p.name).join(', ') || 'None'}
LOW RISK (${lowRisk.length}): ${lowRisk.map(p => p.name).join(', ') || 'None'}

Return this exact JSON structure:
{
  "situationSummary": "2-3 sentence professional summary",
  "overallStatus": "CRITICAL or WARNING or STABLE",
  "priorityPatients": [{ "name": "name", "reason": "reason", "urgency": "HIGH or MEDIUM" }],
  "recommendedActions": [{ "patient": "name", "action": "action", "icon": "phone or mail or alert-triangle or clock" }],
  "positiveNote": "one encouraging sentence"
}

Rules: CRITICAL if avg compliance < 30%, WARNING if < 70%, STABLE otherwise. Max 4 priority patients, max 4 actions. Return ONLY JSON.`;

    this.coordinatorService.generatePredictionAI(this.coordinatorId, prompt).subscribe({
      next: (res) => {
        if (res.response) {
          try {
            const clean = res.response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            this.briefing = JSON.parse(clean);
          } catch (e) {
            console.error('JSON parse error:', e);
            this.aiError = 'Unable to parse AI response.';
          }
        } else {
          this.aiError = 'AI analysis unavailable.';
        }
        this.loadingAi = false;
      },
      error: () => { this.aiError = 'AI analysis unavailable.'; this.loadingAi = false; },
    });
  }

  getStatusColor(status: string): string {
    if (status === 'CRITICAL') return '#dc2626';
    if (status === 'WARNING') return '#d97706';
    return '#059669';
  }

  getStatusBg(status: string): string {
    if (status === 'CRITICAL') return '#fef2f2';
    if (status === 'WARNING') return '#fffbeb';
    return '#f0fdf4';
  }

  getStatusIcon(status: string): string {
    if (status === 'CRITICAL') return 'alert-triangle';
    if (status === 'WARNING') return 'alert-circle';
    return 'circle-check';
  }

  getStatusLabel(status: string): string {
    if (status === 'CRITICAL') return 'CRITICAL — Immediate action required';
    if (status === 'WARNING') return 'WARNING — Monitor closely';
    return 'STABLE — Situation under control';
  }

  selectPatient(patient: PatientPrediction): void {
    this.selectedPatient = this.selectedPatient?.patientId === patient.patientId ? null : patient;
  }

  sendReminderToPatient(patient: PatientPrediction): void {
    const message = `Dear ${patient.name.split(' ')[0]}, this is a reminder to complete your daily health follow-up. You have missed ${patient.consecutiveMissingDays} consecutive day(s). Compliance rate: ${patient.complianceRate}%. Please submit your vital signs and symptoms report.`;
    this.coordinatorService.createReminder(this.coordinatorId, {
      patientId: patient.patientId, type: 'follow_up', message, status: 'scheduled',
    }).subscribe({
      next: (reminder) => {
        this.coordinatorService.sendReminder(reminder._id).subscribe({
          next: () => alert(`Reminder sent to ${patient.name}`),
        });
      },
      error: (err) => console.error('Reminder error', err),
    });
  }

  getRiskColor(level: string): string {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  }

  getRiskBgColor(level: string): string {
    if (level === 'HIGH') return '#fef2f2';
    if (level === 'MEDIUM') return '#fffbeb';
    return '#f0fdf4';
  }

  getRiskIcon(level: string): string {
    if (level === 'HIGH') return 'alert-triangle';
    if (level === 'MEDIUM') return 'alert-circle';
    return 'circle-check';
  }

  formatDate(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  get highRiskCount(): number { return this.prediction?.patients.filter(p => p.riskLevel === 'HIGH').length || 0; }
  get mediumRiskCount(): number { return this.prediction?.patients.filter(p => p.riskLevel === 'MEDIUM').length || 0; }
  get lowRiskCount(): number { return this.prediction?.patients.filter(p => p.riskLevel === 'LOW').length || 0; }

  get avgCompliance(): number {
    if (!this.prediction?.patients.length) return 0;
    return Math.round(this.prediction.patients.reduce((sum, p) => sum + p.complianceRate, 0) / this.prediction.patients.length);
  }
}