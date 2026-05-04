import { environment } from '../environments/environment';
 import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CoordinatorSummary {
  totalAssignedPatients: number;
  departmentsCovered: number;
  completeProfiles: number;
  missingEmergencyContact: number;
  patientsWithMedicalRecord: number;
  remindersSentToday: number;
  pendingReminders: number;
  missingVitalsToday: number;
  missingSymptomsToday: number;
}

export interface ChartItem { label: string; value: number; }

export interface CoordinatorPatientRow {
  _id: string; name: string; email: string; phone?: string;
  department: string; medicalRecordNumber?: string; status: string;
  vitalsSubmitted?: boolean; vitalsFullyComplete?: boolean; missingVitalFields?: string[];
  symptomsSubmitted?: boolean; symptomsFullyComplete?: boolean; missingSymptomFields?: string[];
  isFullyCompliant?: boolean;
}

export interface CoordinatorDashboardResponse {
  summary: CoordinatorSummary;
  departmentDistribution: ChartItem[];
  recentPatients: CoordinatorPatientRow[];
}

export interface ComplianceRow {
  _id: string; name: string; email: string; department: string;
  vitalsSubmitted: boolean; vitalsFullyComplete: boolean; missingVitalFields: string[];
  symptomsSubmitted: boolean; symptomsFullyComplete: boolean; missingSymptomFields: string[];
  isFullyCompliant: boolean;
}

export interface ReminderRow {
  _id?: string; patientId: any; sentBy?: any; type: string; message: string;
  status: string; scheduledAt?: string; sentAt?: string; createdAt?: string;
}

export function buildReminderMessages(
  missingVitalFields: string[],
  missingSymptomFields: string[],
): { value: string; label: string }[] {
  const messages: { value: string; label: string }[] = [];

  if (missingVitalFields.length > 0 && missingSymptomFields.length > 0) {
    messages.push({
      value: `Please complete your daily follow-up. Missing: ${[...missingVitalFields, ...missingSymptomFields].join(', ')}.`,
      label: 'Complete follow-up (vitals + symptoms)',
    });
  }
  if (missingVitalFields.length > 0) {
    messages.push({
      value: `Please complete your vital signs entry. Missing fields: ${missingVitalFields.join(', ')}.`,
      label: `Missing vitals: ${missingVitalFields.join(', ')}`,
    });
  }
  if (missingSymptomFields.length > 0) {
    messages.push({
      value: `Please complete your symptoms report. Missing fields: ${missingSymptomFields.join(', ')}.`,
      label: `Missing symptoms: ${missingSymptomFields.join(', ')}`,
    });
  }
  messages.push({
    value: 'Reminder: Please complete your daily health follow-up as soon as possible.',
    label: 'General follow-up reminder',
  });

  return messages;
}

@Injectable({ providedIn: 'root' })
export class CoordinatorService {
  private http = inject(HttpClient);
  private apiUrl = '${environment.apiUrl}/coordinator';

  getDashboard(coordinatorId: string): Observable<CoordinatorDashboardResponse> {
    return this.http.get<CoordinatorDashboardResponse>(`${this.apiUrl}/${coordinatorId}/dashboard`);
  }

  getAssignedPatients(coordinatorId: string): Observable<CoordinatorPatientRow[]> {
    return this.http.get<CoordinatorPatientRow[]>(`${this.apiUrl}/${coordinatorId}/patients`);
  }

  getComplianceToday(coordinatorId: string): Observable<ComplianceRow[]> {
    return this.http.get<ComplianceRow[]>(`${this.apiUrl}/${coordinatorId}/compliance/today`);
  }

  getReminders(coordinatorId: string): Observable<ReminderRow[]> {
    return this.http.get<ReminderRow[]>(`${this.apiUrl}/${coordinatorId}/reminders`);
  }

  createReminder(coordinatorId: string, body: { patientId: string; type: string; message: string; scheduledAt?: string; status?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${coordinatorId}/reminders`, body);
  }

  sendReminder(reminderId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reminders/${reminderId}/send`, {});
  }

  cancelReminder(reminderId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/reminders/${reminderId}/cancel`, {});
  }

  deleteReminder(reminderId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/reminders/${reminderId}`);
  }

  updateReminder(reminderId: string, body: { type: string; message: string; scheduledAt?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/reminders/${reminderId}`, body);
  }

  getPersonalizedMessage(coordinatorId: string, patientId: string): Observable<{ message: string; missingVitals: string[]; missingSymptoms: string[] }> {
    return this.http.get<any>(`${this.apiUrl}/${coordinatorId}/patients/${patientId}/message`);
  }

  // ─── AI methods (via backend proxy) ──────────────────────────

  askAI(coordinatorId: string, prompt: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/${coordinatorId}/ai/chat`, { prompt });
  }

  generateSummaryAI(coordinatorId: string, prompt: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/${coordinatorId}/ai/summary`, { prompt });
  }

  generatePredictionAI(coordinatorId: string, prompt: string): Observable<{ response: string }> {
    return this.http.post<{ response: string }>(`${this.apiUrl}/${coordinatorId}/ai/prediction`, { prompt });
  }

  getPatientsWithCompliance(coordinatorId: string): Observable<CoordinatorPatientRow[]> {
    return new Observable((observer) => {
      let patients: CoordinatorPatientRow[] = [];
      let compliance: ComplianceRow[] = [];
      let done = 0;

      const merge = () => {
        const result = patients.map((p) => {
          const c = compliance.find((c) => c._id === p._id);
          return {
            ...p,
            vitalsSubmitted: c?.vitalsSubmitted ?? false,
            vitalsFullyComplete: c?.vitalsFullyComplete ?? false,
            missingVitalFields: c?.missingVitalFields ?? [],
            symptomsSubmitted: c?.symptomsSubmitted ?? false,
            symptomsFullyComplete: c?.symptomsFullyComplete ?? false,
            missingSymptomFields: c?.missingSymptomFields ?? [],
            isFullyCompliant: c?.isFullyCompliant ?? false,
            status: c
              ? c.isFullyCompliant ? 'UP_TO_DATE'
              : c.vitalsSubmitted || c.symptomsSubmitted ? 'INCOMPLETE_TODAY'
              : 'NO_DATA_TODAY'
              : 'NO_DATA_TODAY',
          };
        });
        observer.next(result);
        observer.complete();
      };

      this.getAssignedPatients(coordinatorId).subscribe({
        next: (data) => { patients = data; done++; if (done === 2) merge(); },
        error: (err) => observer.error(err),
      });

      this.getComplianceToday(coordinatorId).subscribe({
        next: (data) => { compliance = data; done++; if (done === 2) merge(); },
        error: () => { done++; if (done === 2) merge(); },
      });
    });
  }
}
