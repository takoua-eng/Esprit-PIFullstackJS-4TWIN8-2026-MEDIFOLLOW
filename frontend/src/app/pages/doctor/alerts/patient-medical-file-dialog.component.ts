import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';
import {
  UsersApiService,
  NurseDossierPayload,
  UserApiRow,
  DiagnosisEntry,
} from 'src/app/services/users-api.service';
import { VitalsApiService, VitalDto } from 'src/app/services/vitals-api.service';
import {
  VitalParametersApiService,
  VitalParametersRaw,
} from 'src/app/services/vital-parameters-api.service';

export interface PatientMedicalFileDialogData {
  patientId: string;
  patientName: string;
}

type VitalParam = 'heartRate' | 'temperature' | 'weight' | 'bloodPressure';

@Component({
  selector: 'app-patient-medical-file-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    NgApexchartsModule,
  ],
  templateUrl: './patient-medical-file-dialog.component.html',
  styleUrls: ['./patient-medical-file-dialog.component.scss'],
})
export class PatientMedicalFileDialogComponent implements OnInit {
  // ── Medical file ─────────────────────────────────────────────────────
  loading = true;
  error: string | null = null;
  dossier: NurseDossierPayload | null = null;
  patient: UserApiRow | null = null;

  // ── Vital parameters chart ────────────────────────────────────────────
  vitalsLoading = true;
  allVitals: VitalDto[] = [];
  selectedParameter: VitalParam = 'heartRate';
  rangeDays = 30;
  vitalChartOptions: any = null;
  trendInsight: string | null = null;

  readonly paramOptions: { value: VitalParam; label: string; icon: string }[] = [
    { value: 'heartRate',     label: 'Heart Rate',     icon: 'heart-rate' },
    { value: 'temperature',   label: 'Temperature',    icon: 'temperature' },
    { value: 'bloodPressure', label: 'Blood Pressure', icon: 'activity' },
    { value: 'weight',        label: 'Weight',         icon: 'weight' },
  ];

  readonly rangeOptions = [
    { value: 7,  label: '7 d' },
    { value: 30, label: '30 d' },
    { value: 90, label: '90 d' },
  ];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PatientMedicalFileDialogData,
    private readonly dialogRef: MatDialogRef<PatientMedicalFileDialogComponent>,
    private readonly usersApi: UsersApiService,
    private readonly vitalsApi: VitalsApiService,
    private readonly vitalParamsApi: VitalParametersApiService,
  ) {}

  ngOnInit(): void {
    // Load dossier + patient demographics
    forkJoin({
      patient: this.usersApi.getUserById(this.data.patientId).pipe(catchError(() => of(null))),
      dossier: this.usersApi.getNurseDossier(this.data.patientId).pipe(catchError(() => of(null))),
    }).subscribe(({ patient, dossier }) => {
      this.patient = patient;
      this.dossier = dossier;
      this.loading = false;
    });

    // Load vitals (nurse-recorded + patient-entered)
    forkJoin({
      nurseVitals: this.vitalsApi.getVitals(this.data.patientId).pipe(catchError(() => of<VitalDto[]>([]))),
      rawParams:   this.vitalParamsApi.getAll().pipe(catchError(() => of<VitalParametersRaw[]>([]))),
    }).subscribe(({ nurseVitals, rawParams }) => {
      const fromPatient = rawParams
        .filter((r) => this.extractPatientId(r) === this.data.patientId)
        .map((r) => this.normalizeVitalParametersRow(r));
      this.allVitals = [...nurseVitals, ...fromPatient].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );
      this.vitalsLoading = false;
      this.rebuildChart();
    });
  }

  // ── Filters ─────────────────────────────────────────────────────────
  onParamChange(p: VitalParam): void {
    this.selectedParameter = p;
    this.rebuildChart();
  }

  onRangeChange(d: number): void {
    this.rangeDays = d;
    this.rebuildChart();
  }

  // ── Chart ────────────────────────────────────────────────────────────
  private rebuildChart(): void {
    this.vitalChartOptions = null;
    this.trendInsight = null;

    const cutoff = Date.now() - this.rangeDays * 86_400_000;
    const list = this.allVitals.filter(
      (v) => new Date(v.recordedAt).getTime() >= cutoff,
    );

    if (list.length === 0) return;

    const labels = list.map((v) =>
      new Date(v.recordedAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
      }),
    );

    if (this.selectedParameter === 'heartRate') {
      const data = list.map((v) => v.heartRate ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: 'HR (bpm)', data }], 'bpm', ['#d32f2f']);
      this.trendInsight = this.computeTrend(list.map((v) => v.heartRate ?? NaN).filter(Number.isFinite), 'bpm');
      return;
    }
    if (this.selectedParameter === 'temperature') {
      const data = list.map((v) => v.temperature ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: '°C', data }], '°C', ['#e53935']);
      this.trendInsight = this.computeTrend(list.map((v) => v.temperature ?? NaN).filter(Number.isFinite), '°C');
      return;
    }
    if (this.selectedParameter === 'weight') {
      const data = list.map((v) => v.weight ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: 'kg', data }], 'kg', ['#7b1fa2']);
      this.trendInsight = this.computeTrend(list.map((v) => v.weight ?? NaN).filter(Number.isFinite), 'kg');
      return;
    }
    // Blood pressure
    const sys: (number | null)[] = [];
    const dia: (number | null)[] = [];
    for (const v of list) {
      const p = this.parseBp(v.bloodPressure);
      sys.push(p?.sys ?? null);
      dia.push(p?.dia ?? null);
    }
    this.vitalChartOptions = this.lineChart(
      labels,
      [{ name: 'Systolic', data: sys }, { name: 'Diastolic', data: dia }],
      'mmHg',
      ['#1565c0', '#0288d1'],
    );
    const validSys = sys.filter((n): n is number => n !== null);
    this.trendInsight = this.computeTrend(validSys, 'mmHg systolic');
  }

  private lineChart(
    categories: string[],
    series: { name: string; data: (number | null)[] }[],
    yTitle: string,
    colors: string[],
  ): any {
    return {
      series,
      chart: { type: 'line', height: 260, toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      markers: { size: 4 },
      colors,
      xaxis: { categories, labels: { rotate: -40, style: { fontSize: '11px' } }, tickAmount: 6 },
      yaxis: { title: { text: yTitle }, labels: { style: { fontSize: '11px' } } },
      legend: { position: 'top', fontSize: '12px' },
      grid: { borderColor: '#f1f1f1' },
      tooltip: { shared: true, intersect: false },
    };
  }

  private computeTrend(values: number[], unit: string): string | null {
    if (values.length < 2) return null;
    const mid = Math.floor(values.length / 2);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
    const a1 = avg(values.slice(0, mid));
    const a2 = avg(values.slice(mid));
    const rel = a1 !== 0 ? ((a2 - a1) / a1) * 100 : 0;
    if (Math.abs(rel) < 3) return `Stable around ${a2.toFixed(1)} ${unit}`;
    if (a2 > a1) return `Upward trend: ${a1.toFixed(1)} → ${a2.toFixed(1)} ${unit}`;
    return `Downward trend: ${a1.toFixed(1)} → ${a2.toFixed(1)} ${unit}`;
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private extractPatientId(r: VitalParametersRaw): string {
    if (typeof r.patientId === 'object' && r.patientId) {
      return String(r.patientId._id ?? '');
    }
    return String(r.patientId ?? '');
  }

  private normalizeVitalParametersRow(raw: VitalParametersRaw): VitalDto {
    const pid = this.extractPatientId(raw);
    const pName =
      typeof raw.patientId === 'object' && raw.patientId
        ? [raw.patientId.firstName, raw.patientId.lastName].filter(Boolean).join(' ')
        : '';
    const sbp = raw.bloodPressureSystolic ?? raw.bloodPressuresystolic;
    const dbp = raw.bloodPressureDiastolic;
    let bloodPressure = raw.bloodPressure?.trim();
    if (!bloodPressure && sbp != null && dbp != null) {
      bloodPressure = `${sbp}/${dbp}`;
    }
    return {
      _id: `vp-${String(raw._id)}`,
      patientId: pid,
      patientName: pName || '—',
      recordedBy: '',
      recorderName: '—',
      entrySource: 'patient',
      temperature: raw.temperature,
      bloodPressure,
      weight: raw.weight,
      heartRate: raw.heartRate,
      notes: raw.notes,
      recordedAt: new Date(raw.recordedAt).toISOString(),
      verifiedAt: null,
    };
  }

  private parseBp(s: string | undefined): { sys: number; dia: number } | null {
    if (!s?.trim()) return null;
    const m = s.trim().match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return null;
    return { sys: +m[1], dia: +m[2] };
  }

  // ── Dossier helpers ──────────────────────────────────────────────────
  get latestEntry(): DiagnosisEntry | null {
    const entries = this.dossier?.diagnosisEntries;
    if (!entries?.length) return null;
    return entries[entries.length - 1];
  }

  get allergiesList(): string[] {
    if (!this.dossier?.allergies) return [];
    try { return JSON.parse(this.dossier.allergies) as string[]; }
    catch { return this.dossier.allergies.split(',').map((s) => s.trim()).filter(Boolean); }
  }

  get substanceList(): string[] {
    if (!this.dossier?.substanceUse) return [];
    try { return JSON.parse(this.dossier.substanceUse) as string[]; }
    catch { return this.dossier.substanceUse.split(',').map((s) => s.trim()).filter(Boolean); }
  }

  get medicalHistoryFlags(): { label: string; key: string }[] {
    const mh = this.dossier?.medicalHistory;
    if (!mh) return [];
    const flags: { label: string; key: string }[] = [
      { label: 'Diabète', key: 'diabetes' },
      { label: 'Hypertension', key: 'hypertension' },
      { label: 'Cardiopathie', key: 'heartDisease' },
      { label: 'Asthme / BPCO', key: 'asthmaOrCOPD' },
      { label: 'Cancer', key: 'cancer' },
    ];
    return flags.filter(f => (mh as Record<string, unknown>)[f.key]);
  }

  get medicationsList() {
    return this.dossier?.medicationsList ?? [];
  }

  get nurseFileUrl(): string {
    return `/dashboard/doctor/medical-file?patientId=${encodeURIComponent(this.data.patientId)}`;
  }

  hasAnyDossierData(): boolean {
    if (!this.dossier) return false;
    return !!(
      this.dossier.bloodType || this.dossier.currentMedications ||
      this.allergiesList.length || this.dossier.pastMedicalHistory ||
      this.substanceList.length || this.dossier.familyHistory || this.latestEntry
    );
  }

  close(): void {
    this.dialogRef.close();
  }
}
