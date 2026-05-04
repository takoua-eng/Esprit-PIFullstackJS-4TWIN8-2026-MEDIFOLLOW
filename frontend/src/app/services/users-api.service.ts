import { environment } from 'src/environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export interface UserListRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Full user row from `GET /users` (role populated when present). */
export interface UserApiRow extends UserListRow {
  role?: { _id: string; name: string } | null;
  /** Doctor profile: patient Mongo ids assigned to this physician. */
  assignedPatients?: string[];
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  medicalRecordNumber?: string;
  address?: string;
  emergencyContact?: string;
}

/** One visit / diagnosis row (doctor appointment + hospitalization details). */
export interface DiagnosisEntry {
  id: string;
  admissionDate?: string;
  dischargeDate?: string;
  dischargeUnit?: string;
  primaryDiagnosis?: string;
  hospitalizationReason?: string;
  secondaryDiagnoses?: string;
  proceduresPerformed?: string;
  dischargeSummaryNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MedicationItem {
  medication: string;
  dose?: string;
  frequency?: string;
  startDate?: string;
}

export interface MedicalHistoryFlags {
  diabetes?: boolean;
  hypertension?: boolean;
  heartDisease?: boolean;
  asthmaOrCOPD?: boolean;
  cancer?: boolean;
  otherConditions?: string;
}

export interface PrimaryDiagnosisInfo {
  condition?: string;
  notes?: string;
}

export interface MonitoringConfig {
  glucoseMonitoring?: boolean;
  isMonitoringActive?: boolean;
  monitoringStartDate?: string;
}

/** Nurse medical dossier fields (API + local cache). */
export interface NurseDossierPayload {
  /** @deprecated Legacy flat block; migrated into diagnosisEntries when missing. */
  admissionDate?: string;
  dischargeDate?: string;
  dischargeUnit?: string;
  primaryDiagnosis?: string;
  hospitalizationReason?: string;
  secondaryDiagnoses?: string;
  proceduresPerformed?: string;
  dischargeSummaryNotes?: string;
  diagnosisEntries?: DiagnosisEntry[];

  // ── Physical profile ─────────────────────────────────────────────────
  height?: number;
  weight?: number;
  bloodType?: string;

  // ── Antécédents (structured) ─────────────────────────────────────────
  medicalHistory?: MedicalHistoryFlags;

  // ── Diagnostic (structured, separate from hospitalization entries) ────
  primaryDiagnosisInfo?: PrimaryDiagnosisInfo;

  // ── Medications (structured list) ────────────────────────────────────
  medicationsList?: MedicationItem[];

  // ── Medications (legacy free-text, kept for backwards compat) ─────────
  currentMedications?: string;

  // ── Monitoring config ─────────────────────────────────────────────────
  monitoringConfig?: MonitoringConfig;

  allergies?: string;
  pastMedicalHistory?: string;
  substanceUse?: string;
  familyHistory?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersApiService {
  private readonly base = `${API_BASE_URL}/users`;

  constructor(private readonly http: HttpClient) {}

  /** All users (backend `GET /users`). */
  getAllUsers(): Observable<UserApiRow[]> {
    return this.http.get<UserApiRow[]>(this.base);
  }

  /**
   * Users filtered by role name (backend `GET /users?role=...`), case-insensitive.
   * e.g. `getUsersByRole('Patient')` for patients only.
   */
  getUsersByRole(role: string): Observable<UserListRow[]> {
    return this.http.get<UserListRow[]>(this.base, {
      params: { role },
    });
  }

  getPatients(): Observable<UserListRow[]> {
    return this.http.get<UserListRow[]>(`${this.base}/patients`);
  }

  getNurses(): Observable<UserListRow[]> {
    return this.http.get<UserListRow[]>(`${this.base}/nurses`);
  }

  getPhysicians(): Observable<UserListRow[]> {
    return this.http.get<UserListRow[]>(`${this.base}/physicians`);
  }

  /** Single user by Mongo `_id` or `userId` string (`GET /users/:id`). */
  getUserById(id: string): Observable<UserApiRow> {
    return this.http.get<UserApiRow>(`${this.base}/${encodeURIComponent(id)}`);
  }

  /** Latest nurse dossier for a patient (MongoDB `_id`). `null` if never saved on server. */
  getNurseDossier(patientId: string): Observable<NurseDossierPayload | null> {
    return this.http.get<NurseDossierPayload | null>(
      `${this.base}/${encodeURIComponent(patientId)}/nurse-dossier`,
    );
  }

  /** Save nurse dossier to the server (persisted in MongoDB). */
  putNurseDossier(
    patientId: string,
    body: Omit<NurseDossierPayload, 'updatedAt'>,
  ): Observable<NurseDossierPayload> {
    return this.http.put<NurseDossierPayload>(
      `${this.base}/${encodeURIComponent(patientId)}/nurse-dossier`,
      body,
    );
  }
}
