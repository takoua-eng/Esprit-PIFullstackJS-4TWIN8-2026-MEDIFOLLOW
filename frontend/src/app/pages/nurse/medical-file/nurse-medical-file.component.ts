import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { jsPDF } from 'jspdf';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconComponent } from 'angular-tabler-icons';
import {
  DiagnosisEntry,
  MedicalHistoryFlags,
  MedicationItem,
  MonitoringConfig,
  NurseDossierPayload,
  PrimaryDiagnosisInfo,
  UserApiRow,
  UserListRow,
  UsersApiService,
} from 'src/app/services/users-api.service';
import { UploadApiService } from 'src/app/services/upload-api.service';
import { HospitalizationHandwritingApiService } from 'src/app/services/hospitalization-handwriting-api.service';
import { recognize } from 'tesseract.js';
import {
  Subject,
  debounceTime,
  EMPTY,
  filter,
  finalize,
  firstValueFrom,
  map,
  switchMap,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

type DossierForm = {
  diagnosisEntries?: DiagnosisEntry[];
  admissionDate?: string;
  dischargeDate?: string;
  dischargeUnit?: string;
  primaryDiagnosis?: string;
  hospitalizationReason?: string;
  secondaryDiagnoses?: string;
  proceduresPerformed?: string;
  dischargeSummaryNotes?: string;
  bloodType: string;
  currentMedications: string;
  allergies: string;
  pastMedicalHistory: string;
  substanceUse: string;
  familyHistory: string;
  currentTreatments?: string;
  chronicDiseases?: string;
  updatedAt: string;
};

type AttachmentItem = {
  id: string;
  docType: 'ordonnance' | 'analyse' | 'imagerie' | 'autre';
  originalName: string;
  filename: string;
  path: string;
  uploadedAt: string;
};

type HospitalizationFieldKey = keyof Pick<
  DiagnosisEntry,
  | 'admissionDate'
  | 'dischargeDate'
  | 'dischargeUnit'
  | 'primaryDiagnosis'
  | 'hospitalizationReason'
  | 'secondaryDiagnoses'
  | 'proceduresPerformed'
  | 'dischargeSummaryNotes'
>;

@Component({
  selector: 'app-nurse-medical-file',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './nurse-medical-file.component.html',
  styleUrls: ['./nurse-medical-file.component.scss'],
})
export class NurseMedicalFileComponent implements OnInit {
  readonly dischargeUnitOptions: Array<{ value: string; labelKey: string }> = [
    { value: 'Cardiology ward', labelKey: 'NURSE_MEDICAL_FILE_UNIT_CARDIOLOGY' },
    { value: 'Internal medicine', labelKey: 'NURSE_MEDICAL_FILE_UNIT_INTERNAL_MEDICINE' },
    { value: 'Neurology ward', labelKey: 'NURSE_MEDICAL_FILE_UNIT_NEUROLOGY' },
    { value: 'Pulmonology ward', labelKey: 'NURSE_MEDICAL_FILE_UNIT_PULMONOLOGY' },
    { value: 'Emergency unit', labelKey: 'NURSE_MEDICAL_FILE_UNIT_EMERGENCY' },
    { value: 'ICU', labelKey: 'NURSE_MEDICAL_FILE_UNIT_ICU' },
    { value: 'Surgery ward', labelKey: 'NURSE_MEDICAL_FILE_UNIT_SURGERY' },
  ];
  readonly bloodTypeOptions: string[] = [
    'A+',
    'A-',
    'B+',
    'B-',
    'AB+',
    'AB-',
    'O+',
    'O-',
  ];
  readonly allergyOptions: Array<{ value: string; labelKey: string }> = [
    { value: 'No known allergies', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_NONE' },
    { value: 'Penicillin', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_PENICILLIN' },
    { value: 'NSAIDs', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_NSAIDS' },
    { value: 'Aspirin', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_ASPIRIN' },
    { value: 'Latex', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_LATEX' },
    { value: 'Peanuts', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_PEANUTS' },
    { value: 'Seafood', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_SEAFOOD' },
    { value: 'Dust mites', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_DUST_MITES' },
    { value: 'Pollen', labelKey: 'NURSE_MEDICAL_FILE_ALLERGY_POLLEN' },
  ];
  readonly substanceUseOptions: Array<{ value: string; labelKey: string }> = [
    { value: 'None', labelKey: 'NURSE_MEDICAL_FILE_SUBSTANCE_NONE' },
    { value: 'Smoking', labelKey: 'NURSE_MEDICAL_FILE_SUBSTANCE_SMOKING' },
    { value: 'Alcohol', labelKey: 'NURSE_MEDICAL_FILE_SUBSTANCE_ALCOHOL' },
    { value: 'Cannabis', labelKey: 'NURSE_MEDICAL_FILE_SUBSTANCE_CANNABIS' },
    { value: 'Other substances', labelKey: 'NURSE_MEDICAL_FILE_SUBSTANCE_OTHER' },
  ];

  patients: UserListRow[] = [];
  patientDetails = new Map<string, UserApiRow>();
  selectedPatientId = '';
  selectedPatientInfo: UserApiRow | null = null;

  diagnosisEntries: DiagnosisEntry[] = [];
  /** Row open for editing (inline form). */
  editingEntryId: string | null = null;
  private editSnapshot: DiagnosisEntry | null = null;
  /** New row not yet committed — cancel removes it. */
  private pendingNewEntryId: string | null = null;

  // ── Physical profile ────────────────────────────────────────────────
  height: number | null = null;
  weight: number | null = null;
  bloodType = '';

  // ── Antécédents ─────────────────────────────────────────────────────
  medicalHistory: MedicalHistoryFlags = {};

  // ── Diagnostic ──────────────────────────────────────────────────────
  primaryDiagnosisInfo: PrimaryDiagnosisInfo = {};

  // ── Medications list ─────────────────────────────────────────────────
  medicationsList: MedicationItem[] = [];

  // ── Legacy free-text medications ──────────────────────────────────────
  currentMedications = '';

  // ── Monitoring config ────────────────────────────────────────────────
  monitoringConfig: MonitoringConfig = { isMonitoringActive: true };

  // ── Existing fields ───────────────────────────────────────────────────
  allergies = '';
  selectedAllergies: string[] = [];
  pastMedicalHistory = '';
  substanceUse = '';
  selectedSubstanceUse: string[] = [];
  familyHistory = '';
  lastUpdatedAt = '';
  selectedDocType: AttachmentItem['docType'] = 'ordonnance';
  selectedFile: File | null = null;
  importStatus = '';
  importingFile = false;

  saving = false;
  uploading = false;
  attachments: AttachmentItem[] = [];

  /** Loading dossier from API when switching patient. */
  dossierLoading = false;
  private dossierLoadSeq = 0;

  /** Avoid auto-save firing when the form is filled from API/localStorage. */
  private suppressDossierAutosave = false;
  private readonly dossierAutosave$ = new Subject<void>();

  private readonly storageKey = 'medi_follow_nurse_dossier_by_patient_v2';
  private readonly attachmentsKey =
    'medi_follow_nurse_dossier_attachments_v1';

  @ViewChild('summaryDialog') summaryDialogRef!: TemplateRef<unknown>;

  constructor(
    private readonly usersApi: UsersApiService,
    private readonly uploadApi: UploadApiService,
    private readonly hospitalizationHwApi: HospitalizationHandwritingApiService,
    private readonly translate: TranslateService,
    private readonly route: ActivatedRoute,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const pid = params.get('patientId');
      if (!pid || !this.patients.some((p) => p._id === pid)) return;
      if (this.selectedPatientId !== pid) {
        this.selectedPatientId = pid;
        this.onPatientChange();
      }
    });

    this.dossierAutosave$
      .pipe(
        debounceTime(2500),
        filter(
          () =>
            !this.suppressDossierAutosave &&
            !!this.selectedPatientId &&
            !this.dossierLoading &&
            !this.importingFile,
        ),
        switchMap(() => {
          this.allergies = this.toStoredMulti(this.selectedAllergies);
          this.substanceUse = this.toStoredMulti(this.selectedSubstanceUse);
          const payload = this.buildDossierPayload();
          if (!this.payloadHasClinicalContent(payload)) return EMPTY;
          const pid = this.selectedPatientId;
          if (!pid) return EMPTY;
          this.saving = true;
          return this.usersApi.putNurseDossier(pid, payload).pipe(
            map((saved) => ({ saved, payload })),
            finalize(() => {
              this.saving = false;
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ saved, payload }) => {
          this.lastUpdatedAt = saved.updatedAt ?? new Date().toISOString();
          this.writeDossierToLocalStorage({
            ...payload,
            updatedAt: this.lastUpdatedAt,
          });
          this.snackBar.open(
            this.translate.instant('NURSE_MEDICAL_FILE_AUTOSAVED_DB'),
            undefined,
            { duration: 2200 },
          );
        },
        error: (err: unknown) => {
          this.showDossierSaveHttpError(err, 'autosave');
        },
      });
  }

  /** Call when the nurse edits dossier fields (triggers debounced save to MongoDB). */
  onDossierFieldChange(): void {
    if (this.suppressDossierAutosave || !this.selectedPatientId || this.dossierLoading) {
      return;
    }
    this.dossierAutosave$.next();
  }

  private endSuppressAutosave(): void {
    queueMicrotask(() => {
      this.suppressDossierAutosave = false;
    });
  }

  ngOnInit(): void {
    this.usersApi.getPatients().subscribe({
      next: (rows) => {
        this.patients = rows;
        const fromQuery = this.route.snapshot.queryParamMap.get('patientId');
        if (fromQuery && rows.some((r) => r._id === fromQuery)) {
          this.selectedPatientId = fromQuery;
        } else if (rows.length) {
          this.selectedPatientId = rows[0]._id;
        }
        if (rows.length) {
          this.onPatientChange();
        }
      },
    });
    this.usersApi.getAllUsers().subscribe({
      next: (rows) => {
        this.patientDetails = new Map(rows.map((u) => [u._id, u]));
        this.onPatientChange();
      },
    });
  }

  onPatientChange(): void {
    if (!this.selectedPatientId) {
      this.selectedPatientInfo = null;
      this.resetForm();
      this.attachments = [];
      this.dossierLoading = false;
      return;
    }
    this.selectedPatientInfo = this.patientDetails.get(this.selectedPatientId) || null;
    this.attachments = this.getStoredAttachments(this.selectedPatientId);

    const seq = ++this.dossierLoadSeq;
    this.dossierLoading = true;
    this.usersApi.getNurseDossier(this.selectedPatientId).subscribe({
      next: (remote) => {
        if (seq !== this.dossierLoadSeq) return;
        this.dossierLoading = false;
        if (remote && this.hasRemoteDossierContent(remote)) {
          this.applyDossierFromRecord(remote);
        } else {
          this.loadDossierFromLocalStorage();
          if (!remote || !this.hasRemoteDossierContent(remote)) {
            this.maybeSyncLocalDossierToDatabase();
          }
        }
      },
      error: () => {
        if (seq !== this.dossierLoadSeq) return;
        this.dossierLoading = false;
        this.loadDossierFromLocalStorage();
      },
    });
  }

  save(): void {
    if (!this.selectedPatientId || this.saving) return;
    this.saving = true;
    this.allergies = this.toStoredMulti(this.selectedAllergies);
    this.substanceUse = this.toStoredMulti(this.selectedSubstanceUse);
    const payload = this.buildDossierPayload();
    this.usersApi.putNurseDossier(this.selectedPatientId, payload).subscribe({
      next: (saved) => {
        this.lastUpdatedAt = saved.updatedAt ?? new Date().toISOString();
        this.writeDossierToLocalStorage({
          ...payload,
          updatedAt: this.lastUpdatedAt,
        });
        this.saving = false;
        this.snackBar.open(
          this.translate.instant('NURSE_MEDICAL_FILE_SAVED_TO_DATABASE'),
          undefined,
          { duration: 4000 },
        );
      },
      error: (err: unknown) => {
        const updatedAt = new Date().toISOString();
        this.lastUpdatedAt = updatedAt;
        this.writeDossierToLocalStorage({ ...payload, updatedAt });
        this.saving = false;
        this.showDossierSaveHttpError(err, 'manual');
      },
    });
  }

  private showDossierSaveHttpError(err: unknown, source: 'manual' | 'autosave'): void {
    console.error(`[nurse medical file] PUT nurse-dossier failed (${source})`, err);
    const detail =
      err instanceof HttpErrorResponse
        ? `HTTP ${err.status} ${typeof err.error === 'object' && err.error && 'message' in err.error ? String((err.error as { message?: string }).message) : err.statusText || ''}`.trim()
        : String(err);
    this.snackBar.open(
      `${this.translate.instant('NURSE_MEDICAL_FILE_SAVE_OFFLINE_ONLY')} (${detail}). ${this.translate.instant('NURSE_MEDICAL_FILE_SAVE_CHECK_API')}`,
      undefined,
      { duration: 8000 },
    );
  }

  private hasRemoteDossierContent(remote: NurseDossierPayload): boolean {
    const entries = remote.diagnosisEntries;
    if (Array.isArray(entries) && entries.length > 0) {
      if (entries.some((e) => this.entryHasClinicalContent(e))) return true;
    }
    const keys: (keyof NurseDossierPayload)[] = [
      'admissionDate',
      'dischargeDate',
      'dischargeUnit',
      'primaryDiagnosis',
      'hospitalizationReason',
      'secondaryDiagnoses',
      'proceduresPerformed',
      'dischargeSummaryNotes',
      'bloodType',
      'currentMedications',
      'allergies',
      'pastMedicalHistory',
      'substanceUse',
      'familyHistory',
      'updatedAt',
      'height',
      'weight',
      'medicalHistory',
      'primaryDiagnosisInfo',
      'medicationsList',
      'monitoringConfig',
    ];
    return keys.some((k) => {
      const val = remote[k];
      if (val === undefined || val === null) return false;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      return String(val).trim().length > 0;
    });
  }

  private applyDossierFromRecord(
    existing: NurseDossierPayload | Record<string, unknown>,
  ): void {
    this.suppressDossierAutosave = true;
    const e = existing as Record<string, unknown>;
    const rawEntries = e['diagnosisEntries'];
    if (Array.isArray(rawEntries) && rawEntries.length > 0) {
      this.diagnosisEntries = rawEntries.map((x) =>
        this.normalizeDiagnosisEntry(x as Record<string, unknown>),
      );
    } else if (this.legacyHasHospitalization(e)) {
      this.diagnosisEntries = [this.legacyToEntry(e)];
    } else {
      this.diagnosisEntries = [];
    }
    this.editingEntryId = null;
    this.editSnapshot = null;
    this.pendingNewEntryId = null;
    // Physical profile
    this.height = e['height'] != null ? Number(e['height']) || null : null;
    this.weight = e['weight'] != null ? Number(e['weight']) || null : null;
    this.bloodType = String(e['bloodType'] ?? '').trim();

    // Antécédents
    const mh = e['medicalHistory'];
    this.medicalHistory = (mh && typeof mh === 'object') ? { ...(mh as MedicalHistoryFlags) } : {};

    // Diagnostic
    const pdi = e['primaryDiagnosisInfo'];
    this.primaryDiagnosisInfo = (pdi && typeof pdi === 'object') ? { ...(pdi as PrimaryDiagnosisInfo) } : {};

    // Medications list
    const ml = e['medicationsList'];
    this.medicationsList = Array.isArray(ml) ? (ml as MedicationItem[]).map(m => ({ ...m })) : [];

    // Legacy medications
    this.currentMedications = String(e['currentMedications'] ?? e['currentTreatments'] ?? '').trim();

    // Monitoring config
    const mc = e['monitoringConfig'];
    this.monitoringConfig = (mc && typeof mc === 'object')
      ? { ...(mc as MonitoringConfig) }
      : { isMonitoringActive: true };

    this.allergies = String(e['allergies'] ?? '').trim();
    this.selectedAllergies = this.fromStoredMulti(this.allergies);
    this.pastMedicalHistory = String(e['pastMedicalHistory'] ?? e['chronicDiseases'] ?? '').trim();
    this.substanceUse = String(e['substanceUse'] ?? '').trim();
    this.selectedSubstanceUse = this.fromStoredMulti(this.substanceUse);
    this.familyHistory = String(e['familyHistory'] ?? '').trim();
    this.lastUpdatedAt = String(e['updatedAt'] ?? '').trim();
    this.endSuppressAutosave();
  }

  private newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private createEmptyDiagnosisEntry(): DiagnosisEntry {
    const now = new Date().toISOString();
    return {
      id: this.newId(),
      admissionDate: '',
      dischargeDate: '',
      dischargeUnit: '',
      primaryDiagnosis: '',
      hospitalizationReason: '',
      secondaryDiagnoses: '',
      proceduresPerformed: '',
      dischargeSummaryNotes: '',
      createdAt: now,
      updatedAt: now,
    };
  }

  private normalizeDiagnosisEntry(o: Record<string, unknown>): DiagnosisEntry {
    const s = (k: string) => String(o[k] ?? '').trim();
    const now = new Date().toISOString();
    return {
      id: s('id') || this.newId(),
      admissionDate: s('admissionDate'),
      dischargeDate: s('dischargeDate'),
      dischargeUnit: s('dischargeUnit'),
      primaryDiagnosis: s('primaryDiagnosis'),
      hospitalizationReason: s('hospitalizationReason'),
      secondaryDiagnoses: s('secondaryDiagnoses'),
      proceduresPerformed: s('proceduresPerformed'),
      dischargeSummaryNotes: s('dischargeSummaryNotes'),
      createdAt: s('createdAt') || now,
      updatedAt: s('updatedAt') || now,
    };
  }

  private trimDiagnosisEntry(e: DiagnosisEntry): DiagnosisEntry {
    const t = (v?: string) => (v ?? '').trim();
    return {
      ...e,
      admissionDate: t(e.admissionDate),
      dischargeDate: t(e.dischargeDate),
      dischargeUnit: t(e.dischargeUnit),
      primaryDiagnosis: t(e.primaryDiagnosis),
      hospitalizationReason: t(e.hospitalizationReason),
      secondaryDiagnoses: t(e.secondaryDiagnoses),
      proceduresPerformed: t(e.proceduresPerformed),
      dischargeSummaryNotes: t(e.dischargeSummaryNotes),
    };
  }

  private entryHasClinicalContent(e: DiagnosisEntry): boolean {
    const t = (v?: string) => String(v ?? '').trim();
    return !!(
      t(e.admissionDate) ||
      t(e.dischargeDate) ||
      t(e.dischargeUnit) ||
      t(e.primaryDiagnosis) ||
      t(e.hospitalizationReason) ||
      t(e.secondaryDiagnoses) ||
      t(e.proceduresPerformed) ||
      t(e.dischargeSummaryNotes)
    );
  }

  private legacyHasHospitalization(e: Record<string, unknown>): boolean {
    const keys = [
      'admissionDate',
      'dischargeDate',
      'dischargeUnit',
      'primaryDiagnosis',
      'hospitalizationReason',
      'secondaryDiagnoses',
      'proceduresPerformed',
      'dischargeSummaryNotes',
    ];
    return keys.some((k) => String(e[k] ?? '').trim().length > 0);
  }

  private legacyToEntry(e: Record<string, unknown>): DiagnosisEntry {
    const s = (k: string) => String(e[k] ?? '').trim();
    const now = new Date().toISOString();
    return {
      id: this.newId(),
      admissionDate: s('admissionDate'),
      dischargeDate: s('dischargeDate'),
      dischargeUnit: s('dischargeUnit'),
      primaryDiagnosis: s('primaryDiagnosis'),
      hospitalizationReason: s('hospitalizationReason'),
      secondaryDiagnoses: s('secondaryDiagnoses'),
      proceduresPerformed: s('proceduresPerformed'),
      dischargeSummaryNotes: s('dischargeSummaryNotes'),
      createdAt: now,
      updatedAt: now,
    };
  }

  addVisit(): void {
    if (this.editingEntryId) this.commitEdit();
    const row = this.createEmptyDiagnosisEntry();
    this.diagnosisEntries = [...this.diagnosisEntries, row];
    this.pendingNewEntryId = row.id;
    this.editingEntryId = row.id;
    this.editSnapshot = null;
    this.onDossierFieldChange();
  }

  startEdit(entry: DiagnosisEntry): void {
    if (this.editingEntryId && this.editingEntryId !== entry.id) {
      this.commitEdit();
    }
    this.editingEntryId = entry.id;
    this.editSnapshot = JSON.parse(JSON.stringify(entry)) as DiagnosisEntry;
  }

  cancelEdit(): void {
    const id = this.editingEntryId;
    if (!id) return;
    const idx = this.diagnosisEntries.findIndex((x) => x.id === id);
    if (idx < 0) {
      this.editingEntryId = null;
      this.editSnapshot = null;
      this.pendingNewEntryId = null;
      return;
    }
    if (this.pendingNewEntryId === id) {
      this.diagnosisEntries = this.diagnosisEntries.filter((x) => x.id !== id);
      this.pendingNewEntryId = null;
    } else if (this.editSnapshot) {
      this.diagnosisEntries[idx] = { ...this.editSnapshot };
      this.diagnosisEntries = [...this.diagnosisEntries];
    }
    this.editingEntryId = null;
    this.editSnapshot = null;
    this.onDossierFieldChange();
  }

  commitEdit(): void {
    const id = this.editingEntryId;
    if (!id) return;
    const idx = this.diagnosisEntries.findIndex((x) => x.id === id);
    if (idx < 0) return;
    const now = new Date().toISOString();
    const cur = this.diagnosisEntries[idx];
    cur.updatedAt = now;
    if (!cur.createdAt?.trim()) cur.createdAt = now;
    this.pendingNewEntryId = null;
    this.editingEntryId = null;
    this.editSnapshot = null;
    this.diagnosisEntries = [...this.diagnosisEntries];
    this.onDossierFieldChange();
  }

  deleteVisit(id: string): void {
    if (this.editingEntryId === id) {
      this.editingEntryId = null;
      this.editSnapshot = null;
      this.pendingNewEntryId = null;
    }
    this.diagnosisEntries = this.diagnosisEntries.filter((x) => x.id !== id);
    this.onDossierFieldChange();
  }

  onVisitFieldChange(): void {
    this.onDossierFieldChange();
  }

  private ensureEditingTargetForImport(): DiagnosisEntry {
    if (this.editingEntryId) {
      const found = this.diagnosisEntries.find((x) => x.id === this.editingEntryId);
      if (found) return found;
    }
    const row = this.createEmptyDiagnosisEntry();
    this.diagnosisEntries = [...this.diagnosisEntries, row];
    this.editingEntryId = row.id;
    this.pendingNewEntryId = row.id;
    this.editSnapshot = null;
    return row;
  }

  private loadDossierFromLocalStorage(): void {
    const all = this.getStoredDossiers();
    const existing = all[this.selectedPatientId];
    if (existing) {
      this.applyDossierFromRecord(existing);
    } else {
      this.resetForm();
    }
  }

  /**
   * If this browser had dossier data only in localStorage and the DB was empty,
   * push it once so other browsers/devices see the same data.
   */
  private maybeSyncLocalDossierToDatabase(): void {
    if (!this.selectedPatientId) return;
    this.allergies = this.toStoredMulti(this.selectedAllergies);
    this.substanceUse = this.toStoredMulti(this.selectedSubstanceUse);
    const payload = this.buildDossierPayload();
    if (!this.payloadHasClinicalContent(payload)) return;
    this.usersApi.putNurseDossier(this.selectedPatientId, payload).subscribe({
      next: (saved) => {
        this.lastUpdatedAt = saved.updatedAt ?? new Date().toISOString();
        this.writeDossierToLocalStorage({
          ...payload,
          updatedAt: this.lastUpdatedAt,
        });
      },
      error: (err: unknown) => {
        console.warn('[nurse medical file] sync local → server failed', err);
      },
    });
  }

  private payloadHasClinicalContent(
    p: Omit<NurseDossierPayload, 'updatedAt'>,
  ): boolean {
    if (p.diagnosisEntries?.some((e) => this.entryHasClinicalContent(e))) {
      return true;
    }
    return Object.entries(p).some(([key, v]) => {
      if (key === 'diagnosisEntries') return false;
      if (Array.isArray(v)) return false;
      return String(v ?? '').trim().length > 0;
    });
  }

  private buildDossierPayload(): Omit<NurseDossierPayload, 'updatedAt'> {
    // Auto-activate glucose monitoring when diabetes is flagged
    const monitoring: MonitoringConfig = {
      ...this.monitoringConfig,
      glucoseMonitoring: this.monitoringConfig.glucoseMonitoring ?? this.medicalHistory.diabetes ?? false,
    };

    return {
      admissionDate: '',
      dischargeDate: '',
      dischargeUnit: '',
      primaryDiagnosis: '',
      hospitalizationReason: '',
      secondaryDiagnoses: '',
      proceduresPerformed: '',
      dischargeSummaryNotes: '',
      diagnosisEntries: this.diagnosisEntries.map((x) => this.trimDiagnosisEntry(x)),
      height: this.height ?? undefined,
      weight: this.weight ?? undefined,
      bloodType: this.bloodType.trim(),
      medicalHistory: { ...this.medicalHistory },
      primaryDiagnosisInfo: { ...this.primaryDiagnosisInfo },
      medicationsList: this.medicationsList.filter(m => m.medication.trim()),
      currentMedications: this.currentMedications.trim(),
      monitoringConfig: monitoring,
      allergies: this.allergies.trim(),
      pastMedicalHistory: this.pastMedicalHistory.trim(),
      substanceUse: this.substanceUse.trim(),
      familyHistory: this.familyHistory.trim(),
    };
  }

  // ── Medications list helpers ──────────────────────────────────────────
  addMedication(): void {
    this.medicationsList = [...this.medicationsList, { medication: '', dose: '', frequency: '', startDate: '' }];
    this.onDossierFieldChange();
  }

  removeMedication(index: number): void {
    this.medicationsList = this.medicationsList.filter((_, i) => i !== index);
    this.onDossierFieldChange();
  }

  private writeDossierToLocalStorage(row: NurseDossierPayload): void {
    const all = this.getStoredDossiers();
    all[this.selectedPatientId] = {
      diagnosisEntries: row.diagnosisEntries ?? [],
      bloodType: row.bloodType ?? '',
      currentMedications: row.currentMedications ?? '',
      allergies: row.allergies ?? '',
      pastMedicalHistory: row.pastMedicalHistory ?? '',
      substanceUse: row.substanceUse ?? '',
      familyHistory: row.familyHistory ?? '',
      updatedAt: row.updatedAt ?? '',
    };
    localStorage.setItem(this.storageKey, JSON.stringify(all));
  }

  openSummary(): void {
    this.dialog.open(this.summaryDialogRef, { width: '720px', maxHeight: '85vh' });
  }

  printMedicalFilePdf(): void {
    if (!this.selectedPatientId || !this.selectedPatientInfo) return;
    const p = this.selectedPatientInfo;
    const t = (k: string) => this.translate.instant(k);
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 16;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - margin * 2;
    let y = margin;
    const lh = 5;

    const ensureSpace = (h: number) => {
      if (y + h > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const addTitle = (text: string, size: number) => {
      ensureSpace(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      doc.text(text, margin, y);
      y += size * 0.5 + 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
    };

    const addSection = (titleKey: string) => {
      ensureSpace(10);
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(t(titleKey), margin, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
    };

    const addBlock = (labelKey: string, value: string) => {
      const body = (value ?? '').trim() || '-';
      doc.setFont('helvetica', 'bold');
      const label = t(labelKey) + ':';
      ensureSpace(lh + 2);
      doc.text(label, margin, y);
      y += lh;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(body, maxW);
      ensureSpace(lines.length * lh);
      doc.text(lines, margin, y);
      y += lines.length * lh + 2;
    };

    addTitle(t('NURSE_MEDICAL_FILE_PDF_TITLE'), 15);
    doc.setFontSize(9);
    doc.setTextColor(90);
    ensureSpace(6);
    doc.text(`${t('NURSE_MEDICAL_FILE_PDF_GENERATED')}: ${new Date().toLocaleString()}`, margin, y);
    y += 8;
    doc.setTextColor(0);
    doc.setFontSize(10);

    addSection('NURSE_MEDICAL_FILE_PDF_SECTION_PATIENT');
    addBlock(
      'NURSE_MEDICAL_FILE_PDF_FULL_NAME',
      `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
    );
    addBlock('NURSE_MEDICAL_FILE_PDF_EMAIL', p.email ?? '');
    addBlock('NURSE_MEDICAL_FILE_PDF_PHONE', p.phone ?? '');
    addBlock('NURSE_MEDICAL_FILE_PDF_ADDRESS', p.address ?? '');
    addBlock('NURSE_MEDICAL_FILE_PDF_MRN', p.medicalRecordNumber ?? '');
    addBlock('NURSE_MEDICAL_FILE_PDF_DOB', p.dateOfBirth ?? '');
    addBlock('NURSE_MEDICAL_FILE_PDF_GENDER', p.gender ?? '');
    addBlock('NURSE_MEDICAL_FILE_EMERGENCY', p.emergencyContact ?? '');

    addSection('NURSE_MEDICAL_FILE_PATIENT_FILE_TITLE');
    if (this.diagnosisEntries.length === 0) {
      ensureSpace(lh);
      doc.text(t('NURSE_MEDICAL_FILE_VISITS_EMPTY'), margin, y);
      y += lh + 2;
    } else {
      this.diagnosisEntries.forEach((entry, i) => {
        ensureSpace(10);
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${t('NURSE_MEDICAL_FILE_PDF_VISIT_LABEL')} ${i + 1}`, margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        addBlock('NURSE_MEDICAL_FILE_ADMISSION_DATE', this.formatPdfDate(entry.admissionDate ?? ''));
        addBlock('NURSE_MEDICAL_FILE_DISCHARGE_DATE', this.formatPdfDate(entry.dischargeDate ?? ''));
        addBlock('NURSE_MEDICAL_FILE_DISCHARGE_UNIT', this.dischargeUnitPdfLabelFor(entry.dischargeUnit ?? ''));
        addBlock('NURSE_MEDICAL_FILE_PRIMARY_DIAGNOSIS', entry.primaryDiagnosis ?? '');
        addBlock('NURSE_MEDICAL_FILE_HOSPITALIZATION_REASON', entry.hospitalizationReason ?? '');
        addBlock('NURSE_MEDICAL_FILE_SECONDARY_DIAGNOSES', entry.secondaryDiagnoses ?? '');
        addBlock('NURSE_MEDICAL_FILE_PROCEDURES', entry.proceduresPerformed ?? '');
        addBlock('NURSE_MEDICAL_FILE_DISCHARGE_SUMMARY', entry.dischargeSummaryNotes ?? '');
      });
    }

    addSection('NURSE_MEDICAL_FILE_PDF_SECTION_CLINICAL');
    addBlock('NURSE_MEDICAL_FILE_BLOOD_TYPE', this.bloodType);
    addBlock('NURSE_MEDICAL_FILE_CURRENT_MEDICATIONS', this.currentMedications);
    addBlock(
      'NURSE_MEDICAL_FILE_ALLERGIES',
      this.formatOptionLabelsForPdf(this.selectedAllergies, this.allergyOptions),
    );
    addBlock('NURSE_MEDICAL_FILE_PAST_MEDICAL_HISTORY', this.pastMedicalHistory);
    addBlock(
      'NURSE_MEDICAL_FILE_SUBSTANCE_USE',
      this.formatOptionLabelsForPdf(this.selectedSubstanceUse, this.substanceUseOptions),
    );
    addBlock('NURSE_MEDICAL_FILE_FAMILY_HISTORY', this.familyHistory);

    addSection('NURSE_MEDICAL_FILE_ATTACHMENTS_TITLE');
    if (this.attachments.length === 0) {
      ensureSpace(lh);
      doc.text(t('NURSE_MEDICAL_FILE_ATTACHMENTS_EMPTY'), margin, y);
      y += lh + 2;
    } else {
      this.attachments.forEach((a, i) => {
        const line = `${i + 1}. ${a.originalName} (${a.docType}) — ${new Date(a.uploadedAt).toLocaleString()}`;
        const lines = doc.splitTextToSize(line, maxW);
        ensureSpace(lines.length * lh);
        doc.text(lines, margin, y);
        y += lines.length * lh + 1;
      });
    }

    const rawName = `${p.firstName ?? 'patient'}-${p.lastName ?? 'file'}`.replace(/[^a-zA-Z0-9-_]/g, '_');
    doc.save(`medical-file-${rawName}.pdf`);
  }

  private formatPdfDate(iso: string): string {
    const v = iso?.trim() ?? '';
    if (!v) return '-';
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return v;
  }

  private dischargeUnitPdfLabelFor(unit: string): string {
    const u = unit?.trim() ?? '';
    if (!u) return '-';
    const o = this.dischargeUnitOptions.find((x) => x.value === u);
    return o ? this.translate.instant(o.labelKey) : u;
  }

  private formatOptionLabelsForPdf(
    values: string[],
    options: Array<{ value: string; labelKey: string }>,
  ): string {
    if (!values.length) return '-';
    return values
      .map((v) => {
        const o = options.find((x) => x.value === v);
        return o ? this.translate.instant(o.labelKey) : v;
      })
      .join(', ');
  }

  onPickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  uploadAttachment(): void {
    if (!this.selectedPatientId || !this.selectedFile || this.uploading) return;
    const file = this.selectedFile;
    this.uploading = true;
    this.uploadApi.upload(file).subscribe({
      next: (res) => {
        const list = this.getStoredAttachments(this.selectedPatientId);
        const newItem: AttachmentItem = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          docType: this.selectedDocType,
          originalName: file.name,
          filename: res.filename,
          path: res.path,
          uploadedAt: new Date().toISOString(),
        };
        const all = this.getAllAttachments();
        all[this.selectedPatientId] = [newItem, ...list];
        localStorage.setItem(this.attachmentsKey, JSON.stringify(all));
        this.attachments = all[this.selectedPatientId];
        this.selectedFile = null;
        this.uploading = false;
      },
      error: () => {
        this.uploading = false;
      },
    });
  }

  removeAttachment(id: string): void {
    if (!this.selectedPatientId) return;
    const all = this.getAllAttachments();
    const next = (all[this.selectedPatientId] || []).filter((x) => x.id !== id);
    all[this.selectedPatientId] = next;
    localStorage.setItem(this.attachmentsKey, JSON.stringify(all));
    this.attachments = next;
  }

  onImportHospitalizationFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importingFile = true;
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? '');
        this.importFromJson(content);
        this.importingFile = false;
      };
      reader.onerror = () => {
        this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_FAILED';
        this.importingFile = false;
      };
      reader.readAsText(file);
    } else if (
      lowerName.endsWith('.txt') ||
      lowerName.endsWith('.md') ||
      lowerName.endsWith('.csv')
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = String(reader.result ?? '');
        this.importFromText(content);
        this.importingFile = false;
      };
      reader.onerror = () => {
        this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_FAILED';
        this.importingFile = false;
      };
      reader.readAsText(file);
    } else if (
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp')
    ) {
      this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_PROCESSING';
      this.importFromImage(file).finally(() => {
        this.importingFile = false;
      });
    } else {
      this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_UNSUPPORTED';
      this.importingFile = false;
    }
    input.value = '';
  }

  private resetForm(): void {
    this.suppressDossierAutosave = true;
    this.diagnosisEntries = [];
    this.editingEntryId = null;
    this.editSnapshot = null;
    this.pendingNewEntryId = null;
    this.height = null;
    this.weight = null;
    this.bloodType = '';
    this.medicalHistory = {};
    this.primaryDiagnosisInfo = {};
    this.medicationsList = [];
    this.currentMedications = '';
    this.monitoringConfig = { isMonitoringActive: true };
    this.allergies = '';
    this.selectedAllergies = [];
    this.pastMedicalHistory = '';
    this.substanceUse = '';
    this.selectedSubstanceUse = [];
    this.familyHistory = '';
    this.lastUpdatedAt = '';
    this.endSuppressAutosave();
  }

  private getStoredDossiers(): Record<string, DossierForm> {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, DossierForm>;
    } catch {
      return {};
    }
  }

  private getAllAttachments(): Record<string, AttachmentItem[]> {
    const raw = localStorage.getItem(this.attachmentsKey);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as Record<string, AttachmentItem[]>;
    } catch {
      return {};
    }
  }

  private getStoredAttachments(patientId: string): AttachmentItem[] {
    const all = this.getAllAttachments();
    return all[patientId] || [];
  }

  private toStoredMulti(values: string[]): string {
    return values
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .join(' | ');
  }

  private fromStoredMulti(value: string): string[] {
    if (!value.trim()) return [];
    return value
      .split('|')
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }

  private importFromJson(content: string): void {
    try {
      const data = JSON.parse(content) as Record<string, unknown>;
      const t = this.ensureEditingTargetForImport();
      t.admissionDate = this.normalizeDate(
        String(data['admissionDate'] ?? data['admission_date'] ?? t.admissionDate ?? ''),
      );
      t.dischargeDate = this.normalizeDate(
        String(data['dischargeDate'] ?? data['discharge_date'] ?? t.dischargeDate ?? ''),
      );
      t.dischargeUnit = String(
        data['dischargeUnit'] ?? data['discharge_unit'] ?? t.dischargeUnit ?? '',
      ).trim();
      t.primaryDiagnosis = String(
        data['primaryDiagnosis'] ?? data['primary_diagnosis'] ?? t.primaryDiagnosis ?? '',
      ).trim();
      t.hospitalizationReason = String(
        data['hospitalizationReason'] ??
          data['reasonForHospitalization'] ??
          t.hospitalizationReason ??
          '',
      ).trim();
      t.secondaryDiagnoses = String(
        data['secondaryDiagnoses'] ?? data['secondary_diagnoses'] ?? t.secondaryDiagnoses ?? '',
      ).trim();
      t.proceduresPerformed = String(
        data['proceduresPerformed'] ?? data['procedures'] ?? t.proceduresPerformed ?? '',
      ).trim();
      t.dischargeSummaryNotes = String(
        data['dischargeSummaryNotes'] ?? data['discharge_summary'] ?? t.dischargeSummaryNotes ?? '',
      ).trim();
      this.diagnosisEntries = [...this.diagnosisEntries];
      this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_SUCCESS';
      this.onDossierFieldChange();
    } catch {
      this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_FAILED';
    }
  }

  private importFromText(
    content: string,
    opts?: { fromOcr?: boolean },
  ): void {
    const target = this.ensureEditingTargetForImport();
    const raw = opts?.fromOcr ? this.scrubOcrText(content) : content;
    const normalized = this.normalizeImportText(raw);
    const blockResult = this.extractHospitalizationBlocks(normalized);
    let matchedCount = 0;

    if (blockResult.foundHeaders.length >= 2) {
      if (!blockResult.fields.admissionDate?.trim()) target.admissionDate = '';
      if (!blockResult.fields.dischargeDate?.trim()) target.dischargeDate = '';
      if (!blockResult.fields.dischargeUnit?.trim()) target.dischargeUnit = '';
    }

    const f = blockResult.fields;
    const ad = f.admissionDate?.trim();
    if (ad) {
      const n = this.normalizeDate(ad);
      if (n) {
        target.admissionDate = n;
        matchedCount++;
      }
    }
    const dd = f.dischargeDate?.trim();
    if (dd) {
      const n = this.normalizeDate(dd);
      if (n) {
        target.dischargeDate = n;
        matchedCount++;
      }
    }
    const du = f.dischargeUnit?.trim();
    if (du) {
      const mapped = this.matchDischargeUnitToOption(du);
      if (mapped) {
        target.dischargeUnit = mapped;
        matchedCount++;
      }
    }
    if (f.primaryDiagnosis?.trim()) {
      target.primaryDiagnosis = f.primaryDiagnosis.trim();
      matchedCount++;
    }
    if (f.hospitalizationReason?.trim()) {
      target.hospitalizationReason = f.hospitalizationReason.trim();
      matchedCount++;
    }
    if (f.secondaryDiagnoses?.trim()) {
      target.secondaryDiagnoses = f.secondaryDiagnoses.trim();
      matchedCount++;
    }
    if (f.proceduresPerformed?.trim()) {
      target.proceduresPerformed = f.proceduresPerformed.trim();
      matchedCount++;
    }
    if (f.dischargeSummaryNotes?.trim()) {
      target.dischargeSummaryNotes = f.dischargeSummaryNotes.trim();
      matchedCount++;
    }

    if (matchedCount === 0) {
      matchedCount += this.importFromTextLegacy(normalized, target);
    }

    this.diagnosisEntries = [...this.diagnosisEntries];
    if (matchedCount > 0) this.onDossierFieldChange();

    this.importStatus =
      matchedCount > 0
        ? 'NURSE_MEDICAL_FILE_IMPORT_SUCCESS'
        : opts?.fromOcr
          ? 'NURSE_MEDICAL_FILE_IMPORT_OCR_NO_MATCH'
          : 'NURSE_MEDICAL_FILE_IMPORT_NO_MATCH';
  }

  /** Light cleanup after Tesseract on handwriting (spacing, noise). */
  private scrubOcrText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private normalizeImportText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[“”]/g, '"')
      .trim();
  }

  private cleanupImportedBlock(value: string): string {
    return value
      .split('\n')
      .map((line) => line.replace(/^\s*[-•*·]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  private mapHeaderLabelToKey(label: string): HospitalizationFieldKey | null {
    const l = label.toLowerCase().replace(/\s+/g, ' ').trim();
    if (
      (l.includes('admission') && l.includes('date')) ||
      /date\s*d['']?\s*admission/.test(l)
    )
      return 'admissionDate';
    if (
      (l.includes('discharge') && l.includes('date')) ||
      (l.includes('date') && l.includes('sortie') && !l.includes('résum') && !l.includes('resum'))
    )
      return 'dischargeDate';
    if (
      (l.includes('discharge') && l.includes('unit')) ||
      (l.includes('sortie') &&
        (l.includes('service') || l.includes('unit') || l.includes('unité')) &&
        !l.match(/date\s*de\s*sortie/))
    )
      return 'dischargeUnit';
    if (
      l.includes('secondary') ||
      l.includes('secondaires') ||
      (l.includes('diagnostic') && l.includes('second'))
    )
      return 'secondaryDiagnoses';
    if (
      l.includes('primary') ||
      l.includes('primar') ||
      (l.includes('diagnostic') && l.includes('principal')) ||
      (l.includes('diagnosis') && (l.includes('primary') || l.includes('primar')))
    )
      return 'primaryDiagnosis';
    if (
      (l.includes('reason') && l.includes('hospitalization')) ||
      (l.includes('motif') && l.includes('hospital'))
    )
      return 'hospitalizationReason';
    if (
      l.includes('procedure') ||
      l.includes('chirurg') ||
      (l.includes('surgeries') && l.includes('performed')) ||
      (l.includes('intervention') && l.includes('réalis'))
    )
      return 'proceduresPerformed';
    if (
      (l.includes('discharge') && l.includes('summary')) ||
      (l.includes('résum') && l.includes('sortie')) ||
      (l.includes('resum') && l.includes('sortie')) ||
      (l.includes('notes') && l.includes('sortie'))
    )
      return 'dischargeSummaryNotes';
    return null;
  }

  private matchDischargeUnitToOption(raw: string): string {
    const t = raw.trim().toLowerCase();
    if (!t) return '';
    const exact = this.dischargeUnitOptions.find((o) => o.value.toLowerCase() === t);
    if (exact) return exact.value;
    const partial = this.dischargeUnitOptions.find(
      (o) => t.includes(o.value.toLowerCase()) || o.value.toLowerCase().includes(t),
    );
    return partial?.value ?? '';
  }

  private extractHospitalizationBlocks(text: string): {
    fields: Partial<Record<HospitalizationFieldKey, string>>;
    foundHeaders: string[];
  } {
    const fields: Partial<Record<HospitalizationFieldKey, string>> = {};

    const headerRe =
      /(?:^|\n)\s*[-–—*]?\s*(Admission\s*date|Discharge\s*date|Discharge\s*unit|Date\s*d['']?\s*admission|Date\s*de\s*sortie|Service\s*(?:\/\s*)?unit[eé]?\s*de\s*sortie|Unit[eé]\s*de\s*sortie|Primar[yv]\s*diagnosis|Primary\s*diagnosis|Diagnostic\s*principal|Reason\s*for\s*hospitalization|Motif\s*d['']?hospitalisation|Secondary\s*diagnoses|Diagnostics\s*secondaires|Procedures\s*(?:\/\s*surgeries)?\s*performed|Proc[eé]dures\s*(?:\/\s*chirurgies)?(?:\s*r[eé]alis[eé]es)?|Discharge\s*summary\s*notes|R[eé]sum[eé]\s*de\s*sortie|Notes\s*du\s*r[eé]sum[eé])/gi;

    const matches: { index: number; end: number; label: string }[] = [];
    let m: RegExpExecArray | null;
    while ((m = headerRe.exec(text)) !== null) {
      matches.push({ index: m.index, end: m.index + m[0].length, label: m[1] });
    }

    const foundHeaders: string[] = [];
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const key = this.mapHeaderLabelToKey(cur.label);
      if (!key) continue;
      foundHeaders.push(cur.label);
      const start = cur.end;
      const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
      const raw = text.slice(start, end);
      const cleaned = this.cleanupImportedBlock(raw);
      if (cleaned) fields[key] = cleaned;
    }

    return { fields, foundHeaders };
  }

  /** Single-line key: value patterns (fallback when section blocks are not detected). */
  private importFromTextLegacy(content: string, target: DiagnosisEntry): number {
    const read = (labels: string[]): string => {
      for (const label of labels) {
        const match = content.match(
          new RegExp(`${label}\\s*[:=-]\\s*(.+)`, 'is'),
        );
        if (match?.[1]) return match[1].trim();
      }
      return '';
    };
    const admission = read(['admission\\s*date', 'date\\s*d[\'’]?admission']);
    const discharge = read(['discharge\\s*date', 'date\\s*de\\s*sortie']);
    const unit = read(['discharge\\s*unit', '\\bward\\b', 'service\\s*de\\s*sortie']);
    const primary = read(['primary\\s*diagnosis', 'diagnostic\\s*principal']);
    const reason = read(['reason\\s*for\\s*hospitalization', 'motif\\s*d[\'’]?hospitalisation']);
    const secondary = read(['secondary\\s*diagnoses', 'diagnostics\\s*secondaires']);
    const procedures = read([
      'procedures\\s*(?:\\/\\s*surgeries)?\\s*performed',
      'procedures\\s*\\/\\s*surgeries',
      'chirurgies',
    ]);
    const summary = read(['discharge\\s*summary\\s*notes', 'discharge\\s*summary', 'resume\\s*de\\s*sortie']);

    let n = 0;
    const nd = this.normalizeDate(admission);
    if (nd) {
      target.admissionDate = nd;
      n++;
    }
    const nd2 = this.normalizeDate(discharge);
    if (nd2) {
      target.dischargeDate = nd2;
      n++;
    }
    const u = this.matchDischargeUnitToOption(unit);
    if (u) {
      target.dischargeUnit = u;
      n++;
    } else if (unit.trim()) {
      target.dischargeUnit = unit.trim();
      n++;
    }
    if (primary) {
      target.primaryDiagnosis = primary;
      n++;
    }
    if (reason) {
      target.hospitalizationReason = reason;
      n++;
    }
    if (secondary) {
      target.secondaryDiagnoses = secondary;
      n++;
    }
    if (procedures) {
      target.proceduresPerformed = procedures;
      n++;
    }
    if (summary) {
      target.dischargeSummaryNotes = summary;
      n++;
    }
    return n;
  }

  private normalizeDate(input: string): string {
    const value = input.trim();
    if (!value) return '';
    const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return value;
    const dmy = value.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    return '';
  }

  /** Non-destructive merge: only sets fields present in the AI payload (user can edit after). */
  private applyAiHospitalizationExtract(data: Record<string, unknown>): number {
    const t = this.ensureEditingTargetForImport();
    let n = 0;

    const adRaw = String(
      data['admissionDate'] ?? data['admission_date'] ?? '',
    ).trim();
    if (adRaw) {
      const nd = this.normalizeDate(adRaw);
      if (nd) {
        t.admissionDate = nd;
        n++;
      }
    }
    const ddRaw = String(
      data['dischargeDate'] ?? data['discharge_date'] ?? '',
    ).trim();
    if (ddRaw) {
      const nd = this.normalizeDate(ddRaw);
      if (nd) {
        t.dischargeDate = nd;
        n++;
      }
    }
    const duRaw = String(
      data['dischargeUnit'] ?? data['discharge_unit'] ?? '',
    ).trim();
    if (duRaw) {
      const mapped = this.matchDischargeUnitToOption(duRaw);
      t.dischargeUnit = mapped || duRaw;
      n++;
    }
    const pd = String(
      data['primaryDiagnosis'] ?? data['primary_diagnosis'] ?? '',
    ).trim();
    if (pd) {
      t.primaryDiagnosis = pd;
      n++;
    }
    const hr = String(
      data['hospitalizationReason'] ?? data['reasonForHospitalization'] ?? '',
    ).trim();
    if (hr) {
      t.hospitalizationReason = hr;
      n++;
    }
    const sd = String(
      data['secondaryDiagnoses'] ?? data['secondary_diagnoses'] ?? '',
    ).trim();
    if (sd) {
      t.secondaryDiagnoses = sd;
      n++;
    }
    const proc = String(
      data['proceduresPerformed'] ?? data['procedures'] ?? '',
    ).trim();
    if (proc) {
      t.proceduresPerformed = proc;
      n++;
    }
    const notes = String(
      data['dischargeSummaryNotes'] ?? data['discharge_summary'] ?? '',
    ).trim();
    if (notes) {
      t.dischargeSummaryNotes = notes;
      n++;
    }

    this.diagnosisEntries = [...this.diagnosisEntries];
    if (n > 0) this.onDossierFieldChange();
    return n;
  }

  private async importFromImage(file: File): Promise<void> {
    let aiResponded = false;
    try {
      const result = await firstValueFrom(
        this.hospitalizationHwApi.parseImage(file),
      );
      aiResponded = true;
      const n = this.applyAiHospitalizationExtract(
        result as unknown as Record<string, unknown>,
      );
      if (n > 0) {
        this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_AI_SUCCESS';
        return;
      }
    } catch {
      // 503 without GROQ_API_KEY, network, or Groq error — fall back to OCR
    }

    try {
      const result = await recognize(file, 'eng+fra');
      const text = result?.data?.text ?? '';
      this.importFromText(text, { fromOcr: true });
      if (
        !aiResponded &&
        this.importStatus === 'NURSE_MEDICAL_FILE_IMPORT_SUCCESS'
      ) {
        this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_AI_FALLBACK_OCR';
      }
    } catch {
      this.importStatus = 'NURSE_MEDICAL_FILE_IMPORT_FAILED';
    }
  }
}