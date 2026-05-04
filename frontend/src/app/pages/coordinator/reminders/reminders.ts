import { Component, OnInit, inject } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import {
  CoordinatorService,
  CoordinatorPatientRow,
  ComplianceRow,
  ReminderRow,
  buildReminderMessages,
} from 'src/app/services/coordinator.service';
import { TranslateModule } from '@ngx-translate/core';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-reminders',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent, ReactiveFormsModule, FormsModule, TranslateModule],
  templateUrl: './reminders.html',
  styleUrls: ['./reminders.scss'],
})
export class RemindersComponent implements OnInit {
  private coordinatorService = inject(CoordinatorService);
  private coreService = inject(CoreService);
  private fb = inject(FormBuilder);

  coordinatorId = '';

  reminders: ReminderRow[] = [];
  patients: CoordinatorPatientRow[] = [];
  complianceData: ComplianceRow[] = [];

  showForm = false;
  editingReminder: ReminderRow | null = null;
  selectedMessage = '';
  messageOptions: { value: string; label: string }[] = [];
  searchQuery = '';
  allDays: string[] = [];
  currentDayIndex = 0;
  pageSize = 10;
  currentPage = 0;

  reminderForm: FormGroup = this.fb.group({
    patientId: ['', Validators.required],
    type: ['follow_up', Validators.required],
    message: ['', [Validators.required, Validators.minLength(5)]],
    scheduledAt: [''],
  });

  displayedColumns = ['patient', 'type', 'message', 'status', 'scheduledAt', 'actions'];

  typeOptions = [
    { value: 'vital_entry', label: 'VITAL_ENTRY' },
    { value: 'questionnaire', label: 'QUESTIONNAIRE' },
    { value: 'follow_up', label: 'FOLLOW_UP' },
  ];

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
    if (!this.coordinatorId) { console.error('No coordinator ID'); return; }
    this.loadReminders();
    this.loadPatients();
    this.loadCompliance();
  }

  loadReminders(): void {
    this.coordinatorService.getReminders(this.coordinatorId).subscribe({
      next: (data) => { this.reminders = data; this.buildDays(); this.currentDayIndex = 0; this.currentPage = 0; },
      error: (err) => console.error('Reminders error', err),
    });
  }

  loadPatients(): void {
    this.coordinatorService.getAssignedPatients(this.coordinatorId).subscribe({
      next: (data) => (this.patients = data),
      error: (err) => console.error('Patients error', err),
    });
  }

  loadCompliance(): void {
    this.coordinatorService.getComplianceToday(this.coordinatorId).subscribe({
      next: (data) => (this.complianceData = data),
      error: () => {},
    });
  }

  buildDays(): void {
    const daySet = new Set<string>();
    for (const r of this.reminders) {
      const d = r.scheduledAt || r.createdAt;
      if (d) daySet.add(this.toDateKey(new Date(d)));
    }
    this.allDays = Array.from(daySet).sort((a, b) => b.localeCompare(a));
  }

  toDateKey(date: Date): string { return date.toISOString().split('T')[0]; }

  formatDay(dayKey: string): string {
    const d = new Date(dayKey + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  get currentDay(): string { return this.allDays[this.currentDayIndex] || ''; }

  prevDay(): void { if (this.currentDayIndex < this.allDays.length - 1) { this.currentDayIndex++; this.currentPage = 0; } }
  nextDay(): void { if (this.currentDayIndex > 0) { this.currentDayIndex--; this.currentPage = 0; } }

  get filteredReminders(): ReminderRow[] {
    let result = this.reminders;
    if (this.currentDay) {
      result = result.filter((r) => {
        const d = r.scheduledAt || r.createdAt;
        return d ? this.toDateKey(new Date(d)) === this.currentDay : false;
      });
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter((r) => this.getPatientName(r.patientId).toLowerCase().includes(q));
    }
    return result;
  }

  get totalPages(): number { return Math.ceil(this.filteredReminders.length / this.pageSize); }

  get paginatedReminders(): ReminderRow[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredReminders.slice(start, start + this.pageSize);
  }

  goToPage(page: number): void { if (page >= 0 && page < this.totalPages) this.currentPage = page; }
  onSearchChange(): void { this.currentPage = 0; }

  onPatientChange(patientId: string): void {
    const compliance = this.complianceData.find((c) => c._id === patientId);
    this.messageOptions = buildReminderMessages(compliance?.missingVitalFields ?? [], compliance?.missingSymptomFields ?? []);
    this.selectedMessage = this.messageOptions[0]?.value || '';
    this.reminderForm.get('message')?.setValue(this.selectedMessage);
  }

  onMessageSelect(value: string): void {
    this.selectedMessage = value;
    this.reminderForm.get('message')?.setValue(value);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.editingReminder = null;
    if (!this.showForm) { this.reminderForm.reset({ type: 'follow_up' }); this.messageOptions = []; this.selectedMessage = ''; }
  }

  startEdit(reminder: ReminderRow): void {
    this.editingReminder = reminder;
    this.showForm = true;
    const patientId = typeof reminder.patientId === 'object' ? reminder.patientId._id : reminder.patientId;
    this.reminderForm.patchValue({
      patientId,
      type: reminder.type,
      message: reminder.message,
      scheduledAt: reminder.scheduledAt ? new Date(reminder.scheduledAt).toISOString().slice(0, 16) : '',
    });
    this.onPatientChange(patientId);
    this.selectedMessage = reminder.message;
  }

  submitReminder(): void {
  if (this.reminderForm.invalid) { this.reminderForm.markAllAsTouched(); return; }
  const { patientId, type, message, scheduledAt } = this.reminderForm.value;

  if (this.editingReminder?._id) {
    this.coordinatorService.updateReminder(this.editingReminder._id, { type, message, scheduledAt })
      .subscribe({
        next: () => { this.loadReminders(); this.toggleForm(); },
        error: (err) => console.error('Update error', err),
      });
  } else {
    // Cr�er en tant que SCHEDULED uniquement — pas d'envoi
    this.coordinatorService.createReminder(this.coordinatorId, {
      patientId, type, message, scheduledAt, status: 'scheduled'
    }).subscribe({
      next: () => { this.loadReminders(); this.toggleForm(); },
      error: (err) => console.error('Create error', err),
    });
  }
}

submitAndSend(): void {
  if (this.reminderForm.invalid) { this.reminderForm.markAllAsTouched(); return; }
  const { patientId, type, message, scheduledAt } = this.reminderForm.value;

  // Cr�er puis envoyer imm�diatement (email + SMS planifi�)
  this.coordinatorService.createReminder(this.coordinatorId, {
    patientId, type, message, scheduledAt, status: 'scheduled'
  }).subscribe({
    next: (reminder) => {
      this.coordinatorService.sendReminder(reminder._id).subscribe({
        next: () => { this.loadReminders(); this.toggleForm(); },
        error: () => { this.loadReminders(); this.toggleForm(); },
      });
    },
    error: (err) => console.error('Create error', err),
  });
}

  sendReminder(reminder: ReminderRow): void {
    if (!reminder._id) return;
    this.coordinatorService.sendReminder(reminder._id).subscribe({ next: () => this.loadReminders() });
  }

  cancelReminder(reminder: ReminderRow): void {
    if (!reminder._id) return;
    this.coordinatorService.cancelReminder(reminder._id).subscribe({ next: () => this.loadReminders() });
  }

  deleteReminder(reminder: ReminderRow): void {
    if (!reminder._id || !window.confirm('Delete this reminder?')) return;
    this.coordinatorService.deleteReminder(reminder._id).subscribe({ next: () => this.loadReminders() });
  }

  getPatientName(patientId: any): string {
    if (patientId && typeof patientId === 'object') return `${patientId.firstName} ${patientId.lastName}`;
    const patient = this.patients.find((p) => p._id === patientId);
    return patient ? patient.name : 'Unknown';
  }

  getStatusClass(status: string): string {
    if (status === 'sent') return 'good';
    if (status === 'cancelled') return 'warn';
    return 'pending';
  }

  get pageNumbers(): number[] { return Array.from({ length: this.totalPages }, (_, i) => i); }
}