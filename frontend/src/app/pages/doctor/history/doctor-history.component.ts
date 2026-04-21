import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from 'src/app/material.module';
import { UsersApiService, UserListRow } from 'src/app/services/users-api.service';
import { VitalsApiService, VitalDto } from 'src/app/services/vitals-api.service';
import { SymptomsApiService, SymptomDto } from 'src/app/services/symptoms-api.service';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import {
  UrgentClinicDialogComponent,
  UrgentClinicDialogResult,
} from './urgent-clinic-dialog.component';
import { QuestionnaireApiService } from 'src/app/services/questionnaire-api.service';
import { CoreService } from 'src/app/services/core.service';
import { SendQuestionnaireDialog } from '../send-questionnaire-dialog/send-questionnaire-dialog.component';
import { ReviewQuestionnaireDialog } from '../review-questionnaire-dialog/review-questionnaire-dialog.component';

type HistoryRow = {
  when: string;
  patientName: string;
  source: 'vital' | 'symptom' | 'questionnaire';
  summary: string;
};

type TrendDirection = 'up' | 'down' | 'flat';
type DayTrend = {
  label: string;
  value: number;
  max: number;
};

@Component({
  selector: 'app-doctor-history',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TranslateModule,
    MaterialModule,
    SendQuestionnaireDialog,
    ReviewQuestionnaireDialog,
  ],
  templateUrl: './doctor-history.component.html',
  styleUrls: ['./doctor-history.component.scss'],
})
export class DoctorHistoryComponent implements OnInit {
  patients: UserListRow[] = [];
  physicians: UserListRow[] = [];
  selectedPatientId = '';
  activePhysicianId: string | null = null;
  loading = true;
  alertLoading = true;

  vitals: VitalDto[] = [];
  symptoms: SymptomDto[] = [];
  alerts: AlertDto[] = [];
  unreviewedResponses: any[] = [];
  allResponses: any[] = [];

  displayedColumns: string[] = ['when', 'patient', 'source', 'summary'];
  
  // Pagination for Validation Box
  vPage = 1;
  vPageSize = 3;

  // Pagination for Instructions Sent Box
  aPage = 1;
  aPageSize = 3;

  // Pagination for Clinical History Table
  hPage = 1;
  hPageSize = 5;


  constructor(
    private readonly usersApi: UsersApiService,
    private readonly vitalsApi: VitalsApiService,
    private readonly symptomsApi: SymptomsApiService,
    private readonly alertsApi: AlertsApiService,
    private readonly questionnaireApi: QuestionnaireApiService,
    private readonly dialog: MatDialog,
    private readonly snack: MatSnackBar,
    private readonly translate: TranslateService,
    private readonly core: CoreService,
  ) {}

  ngOnInit(): void {
    this.usersApi.getPatients().subscribe({
      next: (rows) => {
        this.patients = rows;
        if (rows.length) this.selectedPatientId = rows[0]._id;
        this.loadHistory();
      },
      error: () => {
        this.loading = false;
      },
    });
    this.usersApi.getPhysicians().subscribe({
      next: (rows) => {
        this.physicians = rows;
        
        // 👋 Favor the current user if they are a doctor
        const me = this.core.currentUser();
        if (me && me._id) {
          const foundMe = rows.find(r => r._id === me._id);
          this.activePhysicianId = foundMe ? foundMe._id : (rows.length ? rows[0]._id : null);
        } else {
          this.activePhysicianId = rows.length ? rows[0]._id : null;
        }

        this.loadAlerts();
      },
    });
  }

  loadHistory(): void {
    this.loading = true;
    const pid = this.selectedPatientId || undefined;

    this.vitalsApi.getVitals(pid).subscribe({
      next: (rows) => {
        this.vitals = rows;
        this.loading = false;
      },
      error: () => {
        this.vitals = [];
        this.loading = false;
      },
    });

    this.symptomsApi.getSymptoms(pid).subscribe({
      next: (rows) => {
        this.symptoms = rows;
      },
      error: () => {
        this.symptoms = [];
      },
    });

    if (pid) {
      this.questionnaireApi.getResponsesByPatient(pid).subscribe({
        next: (rows) => {
          this.allResponses = rows;
          this.unreviewedResponses = rows.filter((r: any) => !r.reviewedByDoctor);
          this.loading = false;
        },
        error: () => {
          this.allResponses = [];
          this.unreviewedResponses = [];
          this.loading = false;
        }
      });
    }

    this.loadAlerts();
  }

  private loadAlerts(): void {
    // Proactively try to resolve physician ID from CoreService if missing (e.g. on early refresh)
    if (!this.activePhysicianId) {
      const user = this.core.currentUser();
      if (user?._id) this.activePhysicianId = user._id;
    }

    if (!this.activePhysicianId || !this.selectedPatientId) {
      this.alerts = [];
      this.alertLoading = false;
      return;
    }
    this.alertLoading = true;
    this.alertsApi
      .getAlerts({
        patientId: this.selectedPatientId,
        doctorId: this.activePhysicianId,
      })
      .subscribe({
        next: (rows) => {
          this.alerts = rows;
          this.alertLoading = false;
        },
        error: () => {
          this.alerts = [];
          this.alertLoading = false;
        },
      });
  }

  get historyRows(): HistoryRow[] {
    const vitalRows: HistoryRow[] = this.vitals.map((v) => ({
      when: v.recordedAt,
      patientName: v.patientName,
      source: 'vital',
      summary: this.vitalSummary(v),
    }));
    const symptomRows: HistoryRow[] = this.symptoms.map((s) => ({
      when: s.reportedAt,
      patientName: s.patientName,
      source: 'symptom',
      summary: this.symptomSummary(s),
    }));

    // Find patient name for questionnaires
    const patientName = this.patients.find(p => p._id === this.selectedPatientId);
    const pName = patientName ? `${patientName.firstName} ${patientName.lastName}` : 'Patient';

    const questionnaireRows: HistoryRow[] = this.allResponses
      .filter(r => r.reviewedByDoctor)
      .map(r => ({
        when: r.updatedAt || r.createdAt, // Preferably reviewed date
        patientName: pName,
        source: 'questionnaire',
        summary: r.doctorNotes || 'No notes provided',
      }));

    return [...vitalRows, ...symptomRows, ...questionnaireRows].sort(
      (a, b) => new Date(b.when).getTime() - new Date(a.when).getTime(),
    );
  }

  get totalHPages(): number {
    return Math.ceil(this.historyRows.length / this.hPageSize) || 1;
  }

  get paginatedHistoryRows(): HistoryRow[] {
    if (this.hPage > this.totalHPages) {
      this.hPage = this.totalHPages;
    }
    const start = (Math.max(1, this.hPage) - 1) * this.hPageSize;
    return this.historyRows.slice(start, start + this.hPageSize);
  }

  nextHPage(): void {
    if (this.hPage < this.totalHPages) {
      this.hPage++;
    }
  }

  prevHPage(): void {
    if (this.hPage > 1) {
      this.hPage--;
    }
  }


  get alertsForSelectedPatient(): AlertDto[] {
    return [...this.alerts].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );
  }

  get totalAPages(): number {
    return Math.ceil(this.alertsForSelectedPatient.length / this.aPageSize) || 1;
  }

  get paginatedAlerts(): AlertDto[] {
    if (this.aPage > this.totalAPages) {
      this.aPage = this.totalAPages;
    }
    const start = (Math.max(1, this.aPage) - 1) * this.aPageSize;
    return this.alertsForSelectedPatient.slice(start, start + this.aPageSize);
  }

  nextAPage(): void {
    if (this.aPage < this.totalAPages) {
      this.aPage++;
    }
  }

  prevAPage(): void {
    if (this.aPage > 1) {
      this.aPage--;
    }
  }

  get pendingValidationVitals(): VitalDto[] {
    return this.vitals.filter((v) => !v.verifiedAt);
  }

  get pendingValidationSymptoms(): SymptomDto[] {
    return this.symptoms.filter((s) => !s.verifiedAt);
  }

  get allValidationItems(): any[] {
    const items: any[] = [];
    
    this.pendingValidationVitals.forEach(v => {
      items.push({ type: 'vital', data: v, date: v.recordedAt });
    });
    
    this.pendingValidationSymptoms.forEach(s => {
      items.push({ type: 'symptom', data: s, date: s.reportedAt });
    });
    
    this.unreviewedResponses.forEach(r => {
      items.push({ type: 'questionnaire', data: r, date: r.createdAt });
    });

    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  get totalVPages(): number {
    return Math.ceil(this.allValidationItems.length / this.vPageSize) || 1;
  }

  get paginatedValidationItems(): any[] {
    if (this.vPage > this.totalVPages) {
      this.vPage = this.totalVPages;
    }
    const start = (Math.max(1, this.vPage) - 1) * this.vPageSize;
    return this.allValidationItems.slice(start, start + this.vPageSize);
  }

  nextVPage(): void {
    if (this.vPage < this.totalVPages) {
      this.vPage++;
    }
  }

  prevVPage(): void {
    if (this.vPage > 1) {
      this.vPage--;
    }
  }

  validateVital(v: VitalDto): void {
    if (v.verifiedAt) return;
    this.ensurePhysicianId((id) => {
      this.vitalsApi.verify(v._id, id).subscribe({
        next: (updated) => {
          this.vitals = this.vitals.map((x) =>
            x._id === updated._id ? updated : x,
          );
        },
      });
    });
  }

  validateSymptom(s: SymptomDto): void {
    if (s.verifiedAt) return;
    this.ensurePhysicianId((id) => {
      this.symptomsApi.verify(s._id, id).subscribe({
        next: (updated) => {
          this.symptoms = this.symptoms.map((x) =>
            x._id === updated._id ? updated : x,
          );
        },
      });
    });
  }

  openUrgentClinicFromVital(v: VitalDto): void {
    this.ensurePhysicianId((physicianId) => {
      const ref = this.dialog.open(UrgentClinicDialogComponent, {
        width: 'min(520px, 96vw)',
        data: { patientName: v.patientName },
      });
      ref.afterClosed().subscribe((r: UrgentClinicDialogResult | undefined) => {
        if (!r?.severity) return;
        const param =
          v.heartRate != null
            ? 'heartRate'
            : v.temperature != null
              ? 'temperature'
              : 'bloodPressure';
        const value =
          v.heartRate ?? v.temperature ?? (v.bloodPressure ? 1 : undefined);
        this.alertsApi
          .createUrgentClinicAlert({
            patientId: v.patientId,
            physicianUserId: physicianId,
            severity: r.severity,
            message: r.message || undefined,
            sourceType: 'vital',
            sourceId: v._id,
            parameter: param,
            value,
          })
          .subscribe({
            next: (created) => {
              this.alerts = [created, ...this.alerts];
              this.validateVital(v);
            },
            error: (e) => console.error('Urgent clinic alert failed', e),
          });
      });
    });
  }

  openUrgentClinicFromSymptom(s: SymptomDto): void {
    this.ensurePhysicianId((physicianId) => {
      const ref = this.dialog.open(UrgentClinicDialogComponent, {
        width: 'min(520px, 96vw)',
        data: { patientName: s.patientName },
      });
      ref.afterClosed().subscribe((r: UrgentClinicDialogResult | undefined) => {
        if (!r?.severity) return;
        this.alertsApi
          .createUrgentClinicAlert({
            patientId: s.patientId,
            physicianUserId: physicianId,
            severity: r.severity,
            message: r.message || undefined,
            sourceType: 'symptom',
            sourceId: s._id,
            parameter: 'symptoms',
            value:
              typeof s.painLevel === 'number' ? s.painLevel : undefined,
          })
          .subscribe({
            next: (created) => {
              this.alerts = [created, ...this.alerts];
              this.validateSymptom(s);
            },
            error: (e) => console.error('Urgent clinic alert failed', e),
          });
      });
    });
  }

  /**
   * Resolves physician id on demand (fixes race: /users/physicians may load after first paint).
   */
  private ensurePhysicianId(onReady: (physicianId: string) => void): void {
    if (this.activePhysicianId) {
      onReady(this.activePhysicianId);
      return;
    }

    // ✅ Try to get the current user's ID from CoreService (already set after login)
    const userData = this.core.currentUser();
    
    // 👋 Safe role check: role could be string or populated object
    const r = userData?.role;
    const isDoctor = 
      typeof r === 'string' ? r === 'doctor' :
      (r && typeof r === 'object' && 'name' in r) ? String(r.name) === 'doctor' : 
      false;

    if (userData && isDoctor && userData._id) {
      this.activePhysicianId = userData._id;
      onReady(userData._id);
      return;
    }

    // 🔍 Fallback to the first physician in the system if session data is missing
    this.usersApi.getPhysicians().subscribe({
      next: (rows) => {
        const id = rows[0]?._id ?? null;
        if (id) {
          this.activePhysicianId = id;
          onReady(id);
        } else {
          this.snack.open(
            this.translate.instant('DOCTOR_NO_PHYSICIAN_SNACK'),
            this.translate.instant('CLOSE'),
            { duration: 6000 },
          );
        }
      },
      error: () => {
        this.snack.open(
          this.translate.instant('DOCTOR_NO_PHYSICIAN_SNACK'),
          this.translate.instant('CLOSE'),
          { duration: 6000 },
        );
      },
    });
  }

  openSendQuestionnaireDialog(): void {
    if (!this.selectedPatientId) return;
    const patient = this.patients.find(p => p._id === this.selectedPatientId);
    
    const dialogRef = this.dialog.open(SendQuestionnaireDialog, {
      width: '500px',
      data: { 
        patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Patient', 
        patientId: this.selectedPatientId 
      }
    });

    dialogRef.afterClosed().subscribe(templateId => {
      if (templateId) {
        this.ensurePhysicianId((doctorId) => {
          this.questionnaireApi.createInstance({
            templateId,
            patientId: this.selectedPatientId,
            doctorId
          }).subscribe({
            next: () => {
              this.snack.open('Questionnaire envoyé avec succès', 'OK', { duration: 3000 });
              this.loadHistory();
            },
            error: () => {
              this.snack.open('Échec de l\'envoi du questionnaire', 'OK', { duration: 3000 });
            }
          });
        });
      }
    });
  }

  openReviewDialog(response: any): void {
    const dialogRef = this.dialog.open(ReviewQuestionnaireDialog, {
      width: 'min(650px, 98vw)',
      data: { response }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ensurePhysicianId((doctorId) => {
          this.questionnaireApi.updateReview(response._id, doctorId, {
            reviewedByDoctor: true,
            doctorNotes: result.notes
          }).subscribe({
            next: () => {
              this.snack.open('Réponse validée', 'OK', { duration: 3000 });
              this.loadHistory();
            },
            error: () => {
              this.snack.open('Échec de la validation', 'OK', { duration: 3000 });
            }
          });
        });
      }
    });
  }

  private vitalSummary(v: VitalDto): string {
    const parts: string[] = [];
    if (v.temperature != null) parts.push(`T ${v.temperature}°C`);
    if (v.heartRate != null) parts.push(`HR ${v.heartRate}`);
    if (v.bloodPressure) parts.push(`BP ${v.bloodPressure}`);
    if (v.weight != null) parts.push(`W ${v.weight}kg`);
    return parts.join(' · ') || '—';
  }

  private symptomSummary(s: SymptomDto): string {
    if (s.symptoms?.length) return s.symptoms.join(', ');
    if (s.description) return s.description;
    if (typeof s.painLevel === 'number') return `Pain ${s.painLevel}/10`;
    return '—';
  }

  private computeTrend(values: number[]): TrendDirection {
    if (values.length < 2) return 'flat';
    const latest = values[0];
    const previous = values[1];
    if (latest > previous) return 'up';
    if (latest < previous) return 'down';
    return 'flat';
  }

  private isBloodPressureOutOfRange(bp?: string): boolean {
    if (!bp) return false;
    const m = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);
    if (!m) return false;
    const sys = Number(m[1]);
    const dia = Number(m[2]);
    return sys >= 140 || dia >= 90 || sys <= 90 || dia <= 60;
  }
}
