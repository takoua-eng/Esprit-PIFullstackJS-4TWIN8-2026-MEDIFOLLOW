?import { Component, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import {
  CoordinatorDashboardResponse,
  ComplianceRow,
  CoordinatorService,
  buildReminderMessages,
} from 'src/app/services/coordinator.service';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CoreService } from 'src/app/services/core.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

@Component({
  selector: 'app-coordinator-dashboard',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent, NgApexchartsModule, FormsModule, TranslateModule],
  templateUrl: './coordinator-dashboard.component.html',
  styleUrls: ['./coordinator-dashboard.component.scss'],
})
export class CoordinatorDashboardComponent implements OnInit {
  private coordinatorService = inject(CoordinatorService);
  private router = inject(Router);
  private coreService = inject(CoreService);

  @ViewChild('chatMsgsContainer') chatMessagesEl!: ElementRef;

  coordinatorId = '';
  todayDate = new Date();

  remindedPatientIds: Set<string> = new Set(
    JSON.parse(localStorage.getItem('reminded_patients') || '[]')
  );

  dashboardData: CoordinatorDashboardResponse = {
    summary: {
      totalAssignedPatients: 0, departmentsCovered: 0, completeProfiles: 0,
      missingEmergencyContact: 0, patientsWithMedicalRecord: 0, remindersSentToday: 0,
      pendingReminders: 0, missingVitalsToday: 0, missingSymptomsToday: 0,
    },
    departmentDistribution: [],
    recentPatients: [],
  };

  complianceData: ComplianceRow[] = [];
  departmentChart: any = null;
  submissionOverviewChart: any = null;
  complianceChart: any = null;
  missingFieldsChart: any = null;

  selectedReminderId: string | null = null;
  selectedReminderMessage: string = '';
  reminderMessageOptions: { value: string; label: string }[] = [];

  showSummaryPanel = false;
  summaryText = '';
  summaryLoading = false;
  summaryCopied = false;

  chatOpen = false;
  chatInput = '';
  chatMessages: ChatMessage[] = [
    { role: 'assistant', content: "Hello! I'm your AI assistant. Ask me anything about your patients — compliance, reminders, missing fields, or anything else." },
  ];
  chatLoading = false;

  private deptColors: Record<string, string> = {
    Cardio: '#2563eb', Neurology: '#7c3aed', Oncology: '#db2777',
    Pediatrics: '#059669', Orthopedics: '#d97706', Unknown: '#94a3b8',
  };

  ngOnInit(): void {
    // ── R�cup�rer l'ID du coordinator connect� ──────────────
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

    if (!this.coordinatorId) {
      console.error('No coordinator ID found — user not logged in?');
      return;
    }

    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.coordinatorService.getDashboard(this.coordinatorId).subscribe({
      next: (data) => { this.dashboardData = data; this.buildDepartmentChart(); },
      error: (err) => console.error('Dashboard error', err),
    });
    this.coordinatorService.getComplianceToday(this.coordinatorId).subscribe({
      next: (data) => {
        this.complianceData = data;
        this.buildComplianceChart(data);
        this.buildSubmissionOverviewChart(data);
        this.buildMissingFieldsChart(data);
      },
      error: (err) => console.error('Compliance error', err),
    });
  }

  private getDeptColor(l: string): string { return this.deptColors[l] || '#2563eb'; }

  private buildDepartmentChart(): void {
    const deptLabels = this.dashboardData.departmentDistribution.map((i) => i.label);
    const deptValues = this.dashboardData.departmentDistribution.map((i) => i.value);
    const deptColors = deptLabels.map((l) => this.getDeptColor(l));
    this.departmentChart = {
      series: [{ name: 'Patients', data: deptValues }],
      chart: { type: 'bar', height: 300, toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#6b7280' },
      colors: deptColors,
      dataLabels: { enabled: true, style: { fontSize: '13px', fontWeight: 700, colors: ['#fff'] } },
      plotOptions: { bar: { borderRadius: 8, columnWidth: '50%', distributed: true } },
      xaxis: { categories: deptLabels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '13px', fontWeight: 600 } } },
      yaxis: { min: 0, tickAmount: 4, labels: { formatter: (val: number) => Math.floor(val).toString() } },
      legend: { show: false }, stroke: { show: false },
      tooltip: { theme: 'light', y: { formatter: (val: number) => `${val} patient${val > 1 ? 's' : ''}` } },
      grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    };
  }

  private buildSubmissionOverviewChart(data: ComplianceRow[]): void {
    const fullyCompliant = data.filter((p) => p.isFullyCompliant).length;
    const partial = data.filter((p) => !p.isFullyCompliant && (p.vitalsSubmitted || p.symptomsSubmitted)).length;
    const noSubmission = data.filter((p) => !p.vitalsSubmitted && !p.symptomsSubmitted).length;
    const total = data.length;
    const rate = total > 0 ? Math.round((fullyCompliant / total) * 100) : 0;
    this.submissionOverviewChart = {
      series: [fullyCompliant, partial, noSubmission],
      chart: { type: 'donut', height: 280, fontFamily: 'inherit', toolbar: { show: false } },
      colors: ['#10b981', '#f59e0b', '#ef4444'],
      labels: ['Fully Compliant', 'Partial', 'No Submission'],
      dataLabels: { enabled: true, formatter: (val: number) => `${Math.round(val)}%`, style: { fontSize: '13px', fontWeight: 700 }, dropShadow: { enabled: false } },
      legend: { show: true, position: 'bottom', fontSize: '13px', fontWeight: 600 },
      plotOptions: { pie: { donut: { size: '68%', labels: { show: true, total: { show: true, label: 'Compliance', fontSize: '13px', fontWeight: 600, color: '#6b7280', formatter: () => `${rate}%` } } } } },
      stroke: { show: false },
      tooltip: { y: { formatter: (val: number) => `${val} patient${val > 1 ? 's' : ''}` } },
    };
  }

  private buildComplianceChart(data: ComplianceRow[]): void {
    if (data.length === 0) return;
    const names = data.map((p) => p.name.split(' ')[0]);
    const vitals = data.map((p) => { if (!p.vitalsSubmitted) return 0; if (!p.vitalsFullyComplete) return 1; return 2; });
    const symptoms = data.map((p) => { if (!p.symptomsSubmitted) return 0; if (!p.symptomsFullyComplete) return 1; return 2; });
    this.complianceChart = {
      series: [{ name: 'Vitals', data: vitals }, { name: 'Symptoms', data: symptoms }],
      chart: { type: 'bar', height: 270, toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#6b7280' },
      colors: ['#2563eb', '#10b981'],
      plotOptions: { bar: { borderRadius: 6, columnWidth: '35%', grouped: true } },
      dataLabels: { enabled: true, formatter: (val: number) => { if (val === 0) return '✗'; if (val === 1) return '~'; return '✓'; }, style: { fontSize: '14px', fontWeight: 700, colors: ['#fff'] } },
      xaxis: { categories: names, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '13px', fontWeight: 600 } } },
      yaxis: { min: 0, max: 2, tickAmount: 2, labels: { formatter: (val: number) => { if (val === 0) return 'Missing'; if (val === 1) return 'Partial'; return 'Complete'; } } },
      tooltip: { theme: 'light', y: { formatter: (val: number) => { if (val === 0) return '✗ Not submitted'; if (val === 1) return '~ Submitted but incomplete'; return '✓ Fully complete'; } } },
      legend: { show: true, position: 'top', fontSize: '13px', fontWeight: 600 },
      grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    };
  }

  private buildMissingFieldsChart(data: ComplianceRow[]): void {
    const fieldCount: Record<string, number> = {};
    for (const p of data) {
      for (const f of p.missingVitalFields) fieldCount[f] = (fieldCount[f] || 0) + 1;
      for (const f of p.missingSymptomFields) fieldCount[f] = (fieldCount[f] || 0) + 1;
    }
    const labels = Object.keys(fieldCount);
    const values = Object.values(fieldCount);
    if (labels.length === 0) { this.missingFieldsChart = null; return; }
    this.missingFieldsChart = {
      series: [{ name: 'Patients with missing field', data: values }],
      chart: { type: 'bar', height: 240, toolbar: { show: false }, fontFamily: 'inherit', foreColor: '#6b7280' },
      colors: ['#ef4444'],
      dataLabels: { enabled: true, style: { fontSize: '12px', fontWeight: 700, colors: ['#fff'] } },
      plotOptions: { bar: { borderRadius: 6, columnWidth: '45%', horizontal: false } },
      xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px' } } },
      yaxis: { min: 0, tickAmount: 3, labels: { formatter: (val: number) => Math.floor(val).toString() } },
      tooltip: { theme: 'light', y: { formatter: (val: number) => `${val} patient${val > 1 ? 's' : ''}` } },
      grid: { borderColor: 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    };
  }

  get patientsNeedingAction(): ComplianceRow[] { return this.complianceData.filter((p) => !p.isFullyCompliant); }

  get complianceRate(): number {
    if (this.complianceData.length === 0) return 0;
    return Math.round((this.complianceData.filter((p) => p.isFullyCompliant).length / this.complianceData.length) * 100);
  }

  openReminderFor(patient: ComplianceRow): void {
    this.selectedReminderId = patient._id;
    this.coordinatorService.getPersonalizedMessage(this.coordinatorId, patient._id).subscribe({
      next: (data) => {
        this.reminderMessageOptions = [
          { value: data.message, label: 'Personalized message based on missing fields' },
          { value: 'Reminder: Please complete your daily health follow-up as soon as possible.', label: 'General follow-up reminder' },
        ];
        this.selectedReminderMessage = data.message;
      },
      error: () => {
        this.reminderMessageOptions = buildReminderMessages(patient.missingVitalFields, patient.missingSymptomFields);
        this.selectedReminderMessage = this.reminderMessageOptions[0]?.value || '';
      }
    });
  }

  closeReminder(): void { this.selectedReminderId = null; this.selectedReminderMessage = ''; this.reminderMessageOptions = []; }

  navigateTo(path: string): void { this.router.navigate([path]); }

  confirmReminder(patient: ComplianceRow): void {
    if (!this.selectedReminderMessage.trim()) return;
    this.coordinatorService.createReminder(this.coordinatorId, {
      patientId: patient._id, type: 'follow_up', message: this.selectedReminderMessage, status: 'scheduled',
    }).subscribe({
      next: (reminder) => {
        this.coordinatorService.sendReminder(reminder._id).subscribe({
          next: () => {
            this.remindedPatientIds.add(patient._id);
            localStorage.setItem('reminded_patients', JSON.stringify([...this.remindedPatientIds]));
            this.closeReminder();
          }
        });
      },
      error: (err) => console.error('Reminder error', err),
    });
  }

  // ── DAILY SUMMARY ─────────────────────────────────────────

  toggleSummary(): void {
    this.showSummaryPanel = !this.showSummaryPanel;
    if (this.showSummaryPanel && !this.summaryText) this.generateSummary();
  }

  generateSummary(): void {
    if (this.complianceData.length === 0) return;
    this.summaryLoading = true;
    this.summaryText = '';
    this.summaryCopied = false;

    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const total = this.complianceData.length;
    const compliant = this.complianceData.filter(p => p.isFullyCompliant).length;
    const partial = this.complianceData.filter(p => !p.isFullyCompliant && (p.vitalsSubmitted || p.symptomsSubmitted)).length;
    const noneSubmitted = this.complianceData.filter(p => !p.vitalsSubmitted && !p.symptomsSubmitted).length;
    const rate = Math.round((compliant / total) * 100);

    const patientDetails = this.complianceData.map(p => {
      const missing = [...p.missingVitalFields, ...p.missingSymptomFields];
      const status = p.isFullyCompliant ? 'fully compliant' : missing.length > 0 ? `missing: ${missing.join(', ')}` : 'no submission';
      return `- ${p.name} (${p.department}): ${status}`;
    }).join('\n');

    const prompt = `You are a medical coordinator assistant. Write a professional daily compliance summary for ${today}.

DATA:
- Total patients: ${total}
- Fully compliant: ${compliant} (${rate}%)
- Partial submission: ${partial}
- No submission: ${noneSubmitted}
- Reminders sent today: ${this.dashboardData.summary.remindersSentToday}

Patient details:
${patientDetails}

Write 3-5 professional sentences suitable for sharing with a physician. Include compliance rate, patients needing attention, and a brief recommendation. No bullet points — flowing paragraphs only.`;

    this.coordinatorService.generateSummaryAI(this.coordinatorId, prompt).subscribe({
      next: (res) => {
        this.summaryText = res.response || `Daily Compliance Report — ${today}. Out of ${total} patients, ${compliant} (${rate}%) fully compliant.`;
        this.summaryLoading = false;
      },
      error: () => {
        this.summaryText = `Daily Compliance Report — ${today}. Out of ${total} assigned patients, ${compliant} (${rate}%) have fully completed their daily submissions.`;
        this.summaryLoading = false;
      }
    });
  }

  copySummary(): void {
    navigator.clipboard.writeText(this.summaryText).then(() => {
      this.summaryCopied = true;
      setTimeout(() => this.summaryCopied = false, 2000);
    });
  }

  regenerateSummary(): void { this.generateSummary(); }

  // ── CHATBOT ───────────────────────────────────────────────

  toggleChat(): void { this.chatOpen = !this.chatOpen; }

  sendChatMessage(): void {
    const input = this.chatInput.trim();
    if (!input || this.chatLoading) return;

    this.chatMessages.push({ role: 'user', content: input });
    this.chatInput = '';
    this.chatLoading = true;
    this.chatMessages.push({ role: 'assistant', content: '', loading: true });
    this.scrollChatToBottom();

    const total = this.complianceData.length;
    const compliant = this.complianceData.filter(p => p.isFullyCompliant).length;
    const rate = total > 0 ? Math.round((compliant / total) * 100) : 0;

    const patientContext = this.complianceData.map(p => {
      const missing = [...p.missingVitalFields, ...p.missingSymptomFields];
      return `${p.name} (${p.department}): vitals=${p.vitalsSubmitted ? (p.vitalsFullyComplete ? 'complete' : 'partial') : 'missing'}, symptoms=${p.symptomsSubmitted ? (p.symptomsFullyComplete ? 'complete' : 'partial') : 'missing'}${missing.length > 0 ? ', missing: ' + missing.join(', ') : ''}`;
    }).join('\n');

    const systemContext = `You are an AI assistant for a medical coordinator. Answer questions based on today's real patient data. Be concise (2-3 sentences max).

TODAY'S DATA (${new Date().toLocaleDateString()}):
- Total patients: ${total}, Compliant: ${compliant} (${rate}%)
- Reminders sent today: ${this.dashboardData.summary.remindersSentToday}
- Pending reminders: ${this.dashboardData.summary.pendingReminders}

Patients:
${patientContext}

Coordinator asks: ${input}`;

    this.coordinatorService.askAI(this.coordinatorId, systemContext).subscribe({
      next: (res) => {
        const idx = this.chatMessages.findIndex(m => m.loading);
        if (idx !== -1) this.chatMessages[idx] = { role: 'assistant', content: res.response };
        this.chatLoading = false;
        this.scrollChatToBottom();
      },
      error: () => {
        const idx = this.chatMessages.findIndex(m => m.loading);
        if (idx !== -1) this.chatMessages[idx] = { role: 'assistant', content: 'Sorry, AI is temporarily unavailable.' };
        this.chatLoading = false;
        this.scrollChatToBottom();
      }
    });
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendChatMessage(); }
  }

  clearChat(): void {
    this.chatMessages = [{ role: 'assistant', content: "Hello! I'm your AI assistant. Ask me anything about your patients." }];
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesEl?.nativeElement) {
        this.chatMessagesEl.nativeElement.scrollTop = this.chatMessagesEl.nativeElement.scrollHeight;
      }
    }, 50);
  }
}