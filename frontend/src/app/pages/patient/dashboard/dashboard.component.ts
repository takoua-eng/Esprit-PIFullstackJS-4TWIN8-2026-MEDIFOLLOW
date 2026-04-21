import { Component, OnInit, OnDestroy } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { PatientService, VitalEntry, SymptomEntry, AlertEntry } from 'src/app/services/patient.service';
import { forkJoin } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { TranslateModule } from '@ngx-translate/core';
import { KeyboardAccessibilityService } from 'src/app/services/keyboard-accessibility.service';

@Component({
  selector: 'app-dashboard',
  imports: [MaterialModule, CommonModule, RouterModule, NgApexchartsModule, TranslateModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  isLoading = true;
  todayDate = new Date();
  todayDateStr = new Date().toDateString();
  vitalsEnteredToday = false;
  symptomsEnteredToday = false;
  questionnaireAnsweredToday = false;
  latestVital: VitalEntry | null = null;
  recentAlerts: AlertEntry[] = [];
  pendingAlertsCount = 0;
  usageChartOptions: any;
  private dayCheckInterval: any;

  constructor(
    private patientService: PatientService,
    private router: Router,
    private kbService: KeyboardAccessibilityService,
  ) {}

  ngOnInit() {
    this.todayDateStr = new Date().toDateString();
    const patientId = this.patientService.getCurrentPatientId();
    if (!patientId) {
      this.buildUsageChart([], [], []);
      this.isLoading = false;
      return;
    }
    forkJoin({
      vitalsToday: this.patientService.hasEnteredVitalsToday(),
      symptomsToday: this.patientService.hasEnteredSymptomsToday(),
      questionnaireToday: this.patientService.hasRespondedToQuestionnaireToday(),
      latestVital: this.patientService.getLatestVital(),
      recentAlerts: this.patientService.getRecentAlerts(),
      pendingCount: this.patientService.getPendingAlertsCount(),
      allVitals: this.patientService.getMyVitals(),
      allSymptoms: this.patientService.getMySymptoms(),
      allQuestionnaires: this.patientService.getMyQuestionnaires(),
    }).subscribe({
      next: (data) => {
        this.vitalsEnteredToday = data.vitalsToday;
        this.symptomsEnteredToday = data.symptomsToday;
        this.questionnaireAnsweredToday = data.questionnaireToday;
        this.latestVital = data.latestVital;
        this.recentAlerts = this.filterAlertsForToday(data.recentAlerts || []);
        this.pendingAlertsCount = data.pendingCount;
        this.buildUsageChart(data.allVitals, data.allSymptoms, data.allQuestionnaires as any[]);
        this.isLoading = false;
      },
      error: () => {
        this.buildUsageChart([], [], []);
        this.isLoading = false;
      },
    });

    // Periodically check if the day has changed and clear recent alerts when it does
    this.dayCheckInterval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== this.todayDateStr) {
        this.todayDateStr = today;
        this.recentAlerts = [];
      }
    }, 60_000);
  }

  ngOnDestroy(): void {
    if (this.dayCheckInterval) {
      clearInterval(this.dayCheckInterval);
    }
  }

  private filterAlertsForToday(alerts: AlertEntry[]): AlertEntry[] {
    const today = this.todayDateStr;
    return ((alerts || [])
      .map(a => ({ ...a, message: this.decodeMessage(a.message) }))
      .filter(a => {
        try {
          const d = new Date((a as any).createdAt || (a as any).timestamp || null);
          return d.toDateString() === today;
        } catch (e) {
          return false;
        }
      })) as AlertEntry[];
  }

  private decodeMessage(msg?: string): string {
    if (!msg) return '';
    try {
      // Try to fix common UTF-8/Latin1 mojibake (e.g. "TempÃ©rature" -> "Température")
      // This pattern is a pragmatic browser-side fix for double-encoded strings.
      // Using `escape`/`decodeURIComponent` is a common workaround.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return decodeURIComponent((escape as any)(msg));
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.innerHTML = msg;
        return ta.value || msg;
      } catch (err) {
        return msg;
      }
    }
  }

  buildUsageChart(vitals: VitalEntry[], symptoms: SymptomEntry[], questionnaires: any[]) {
    const days: string[] = [];
    const vitalsData: number[] = [];
    const symptomsData: number[] = [];
    const questData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      days.push(d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }));
      vitalsData.push(vitals.some(v => new Date(v.recordedAt).toDateString() === ds) ? 1 : 0);
      symptomsData.push(symptoms.some(s => new Date(s.reportedAt).toDateString() === ds) ? 1 : 0);
      questData.push(questionnaires.some(q => {
        const d2 = q.submittedAt ?? q.createdAt;
        return d2 && new Date(d2).toDateString() === ds;
      }) ? 1 : 0);
    }
    this.usageChartOptions = {
      series: [
        { name: 'Vital Parameters', data: vitalsData },
        { name: 'Symptoms', data: symptomsData },
        { name: 'Questionnaires', data: questData },
      ],
      chart: { type: 'bar', height: 250, stacked: false, toolbar: { show: false } },
      xaxis: { categories: days, labels: { style: { fontSize: '11px' } } },
      yaxis: { min: 0, max: 1, tickAmount: 1, labels: { formatter: (v: number) => (v === 1 ? 'Done' : '') } },
      colors: ['#1976d2', '#ef5350', '#43a047'],
      legend: { position: 'top' },
      title: { text: 'This Week – Daily Activity', style: { fontSize: '13px', fontWeight: '600' } },
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '50%', borderRadius: 4 } },
      tooltip: { y: { formatter: (v: number) => (v === 1 ? 'Completed' : 'Not done') } },
    };
  }

  resolveAlert(alertId: string) {
    // Optimistically mark as acknowledged locally so it turns green in the UI
    const idx = this.recentAlerts.findIndex(a => a._id === alertId);
    if (idx !== -1) {
      this.recentAlerts[idx] = { ...this.recentAlerts[idx], status: 'acknowledged' };
      this.pendingAlertsCount = Math.max(0, this.pendingAlertsCount - 1);
    }

    // Persist on server; on success update the local entry with server data
    this.patientService.resolveAlert(alertId).subscribe({
      next: (updated) => {
        const i = this.recentAlerts.findIndex(a => a._id === alertId);
        const decodedMsg = this.decodeMessage((updated as any).message);
        if (i !== -1) {
          this.recentAlerts[i] = { ...this.recentAlerts[i], ...updated, message: decodedMsg };
        }
      },
      error: () => {
        // revert optimistic change on error
        const i = this.recentAlerts.findIndex(a => a._id === alertId);
        if (i !== -1) {
          this.recentAlerts[i] = { ...this.recentAlerts[i], status: 'pending' };
          this.pendingAlertsCount = this.pendingAlertsCount + 1;
        }
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
  }

  showKeyboardGuide(): void {
    this.kbService.toggleGuide();
  }
}
