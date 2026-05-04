import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { QuestionnaireApiService } from 'src/app/services/questionnaire-api.service';
import { UserListRow, UsersApiService } from 'src/app/services/users-api.service';
import { MatDialog } from '@angular/material/dialog';
import { SendQuestionnaireDialog } from '../send-questionnaire-dialog/send-questionnaire-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  VitalParametersApiService,
  VitalParametersRaw,
} from 'src/app/services/vital-parameters-api.service';
import { VitalDto, VitalsApiService } from 'src/app/services/vitals-api.service';

type VParam = 'heartRate' | 'temperature' | 'weight' | 'bloodPressure';

interface MonitoredPatientRow {
  patientId: string;
  name: string;
  service: string;
  lastReading: string;
  status: 'Stable' | 'Watch';
  questionnaireToday: boolean;
  unreviewedResponses: number;
}

@Component({
  selector: 'app-doctor-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
    NgApexchartsModule,
    SendQuestionnaireDialog,
  ],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss'],
})
export class DoctorDashboardComponent implements OnInit {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild(MatPaginator) set paginator(p: MatPaginator) {
    this.dataSource.paginator = p ?? null;
  }

  loading = true;
  loadError = false;

  assignedPatients = 0;
  activeAlerts: number | null = null;
  questionnaireCompliancePct: number | null = null;

  dataSource = new MatTableDataSource<MonitoredPatientRow>([]);

  get patients(): MonitoredPatientRow[] {
    return this.dataSource.data;
  }
  set patients(rows: MonitoredPatientRow[]) {
    this.dataSource.data = rows;
  }

  showingAllPatientsFallback = false;

  allVitals: VitalDto[] = [];
  recentAlerts: AlertDto[] = [];

  selectedPatientId = '';
  rangeDays: 7 | 30 | 90 = 7;
  selectedParameter: VParam = 'heartRate';
  vitalChartOptions: any = null;
  trendInsight: string | null = null;

  noDoctorSession = false;

  displayedColumns: string[] = [
    'name',
    'service',
    'lastReading',
    'questionnaire',
    'status',
    'actions',
  ];

  constructor(
    private readonly alertsApi: AlertsApiService,
    private readonly usersApi: UsersApiService,
    private readonly vitalsApi: VitalsApiService,
    private readonly vitalParametersApi: VitalParametersApiService,
    private readonly questionnaireApi: QuestionnaireApiService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  private userIdFromAccessToken(): string | null {
    const token =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string };
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  onChartFiltersChange(): void {
    this.rebuildChartAndTrend();
    this.cdr.markForCheck();
  }

  private mergeVitalSources(
    nurseVitals: VitalDto[],
    rawParams: VitalParametersRaw[],
  ): VitalDto[] {
    const fromPatient = rawParams.map((r) =>
      this.normalizeVitalParametersRow(r),
    );
    return [...nurseVitals, ...fromPatient].sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    );
  }

  private normalizeVitalParametersRow(raw: VitalParametersRaw): VitalDto {
    const pid =
      typeof raw.patientId === 'object' && raw.patientId
        ? String(raw.patientId._id ?? '')
        : String(raw.patientId ?? '');
    const pName =
      typeof raw.patientId === 'object' && raw.patientId
        ? [raw.patientId.firstName, raw.patientId.lastName]
            .filter(Boolean)
            .join(' ')
        : '';
    const sbp = raw.bloodPressureSystolic ?? raw.bloodPressuresystolic;
    const dbp = raw.bloodPressureDiastolic;
    let bloodPressure = raw.bloodPressure?.trim();
    if (!bloodPressure && sbp != null && dbp != null) {
      bloodPressure = `${sbp}/${dbp}`;
    }
    const rb =
      typeof raw.recordedBy === 'object' && raw.recordedBy
        ? String((raw.recordedBy as { _id?: string })._id ?? '')
        : String(raw.recordedBy ?? '');
    return {
      _id: `vp-${String(raw._id)}`,
      patientId: pid,
      patientName: pName || '—',
      recordedBy: rb,
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

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.noDoctorSession = false;

    const doctorId = this.userIdFromAccessToken();
    if (!doctorId) {
      this.noDoctorSession = true;
      this.loading = false;
      return;
    }

    // Phase 1: fetch core data to render the table immediately
    forkJoin({
      profile: this.usersApi.getUserById(doctorId).pipe(catchError(() => of(null))),
      patients: this.usersApi.getPatients().pipe(catchError(() => of([] as UserListRow[]))),
      openCount: this.alertsApi
        .getOpenCount({ doctorId })
        .pipe(catchError(() => of({ count: 0 }))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ profile, patients, openCount }) => {
          this.activeAlerts = openCount.count;

          const assignedIds = new Set(
            (profile?.assignedPatients ?? []).map((id) => String(id)),
          );
          let rows: UserListRow[] = patients;
          this.showingAllPatientsFallback = assignedIds.size === 0;
          if (assignedIds.size > 0) {
            rows = patients.filter((p) => assignedIds.has(p._id));
          }
          this.assignedPatients = rows.length;

          // Render table with placeholder values so UI is visible immediately
          this.patients = rows.map((row) => ({
            patientId: row._id,
            name: `${row.firstName} ${row.lastName}`.trim(),
            service: '—',
            lastReading: '—',
            status: 'Stable' as const,
            questionnaireToday: false,
            unreviewedResponses: 0,
          }));

          if (this.patients.length > 0 && !this.selectedPatientId) {
            this.selectedPatientId = this.patients[0].patientId;
          }

          this.loading = false;
          this.cdr.markForCheck();

          // Phase 2: enrich with vitals + alerts + questionnaires in background
          this.loadPhase2(rows, doctorId);
        },
        error: () => {
          this.loadError = true;
          this.loading = false;
          this.activeAlerts = null;
          this.cdr.markForCheck();
        },
      });
  }

  /** Phase 2: load vitals, alerts, questionnaires — enriches already-rendered table. */
  private loadPhase2(rows: UserListRow[], doctorId: string): void {
    forkJoin({
      vitals: this.vitalsApi.getVitals(undefined, { limit: 200 }).pipe(catchError(() => of([] as VitalDto[]))),
      vitalParameters: this.vitalParametersApi
        .getAll()
        .pipe(catchError(() => of([] as VitalParametersRaw[]))),
      alerts: this.alertsApi
        .getAlerts({ doctorId, limit: 50 })
        .pipe(catchError(() => of([] as AlertDto[]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ vitals, vitalParameters, alerts }) => {
          const merged = this.mergeVitalSources(vitals, vitalParameters);
          this.allVitals = merged;

          const openAlerts = alerts.filter(
            (a) => (a.status || '').toLowerCase() === 'open',
          );
          this.recentAlerts = openAlerts
            .sort(
              (a, b) =>
                new Date(b.createdAt ?? 0).getTime() -
                new Date(a.createdAt ?? 0).getTime(),
            )
            .slice(0, 5);

          // Enrich patient rows with lastReading and status
          const byPatient = new Map<string, VitalDto[]>();
          for (const v of merged) {
            const pid = v.patientId;
            if (!byPatient.has(pid)) byPatient.set(pid, []);
            byPatient.get(pid)!.push(v);
          }
          for (const list of byPatient.values()) {
            list.sort(
              (a, b) =>
                new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
            );
          }

          this.patients = this.patients.map((row) => {
            const pv = byPatient.get(row.patientId) ?? [];
            const latest = pv[0];
            const openForPatient = openAlerts.some((a) => a.patientId === row.patientId);
            return {
              ...row,
              lastReading: latest ? this.formatLatest(latest) : '—',
              status: openForPatient ? 'Watch' : 'Stable',
            };
          });

          this.rebuildChartAndTrend();
          this.cdr.markForCheck();

          // Phase 3: questionnaire compliance (lowest priority, runs concurrently)
          this.loadQuestionnaireCompliance(rows);
        },
      });
  }

  /** Phase 3: questionnaire compliance — runs after phase 2, updates compliance KPI and table column. */
  private loadQuestionnaireCompliance(rows: UserListRow[]): void {
    const qCalls = rows.slice(0, 30).map((p) =>
      this.questionnaireApi.hasRespondedToday(p._id).pipe(
        map((done) => ({ id: p._id, done })),
        catchError(() => of({ id: p._id, done: false })),
      ),
    );

    if (qCalls.length === 0) {
      this.questionnaireCompliancePct = null;
      this.cdr.markForCheck();
      return;
    }

    forkJoin(qCalls)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (qResults) => {
          const qMap = new Map(qResults.map((r) => [r.id, r.done]));
          const doneCount = qResults.filter((r) => r.done).length;
          this.questionnaireCompliancePct =
            qResults.length > 0
              ? Math.round((doneCount / qResults.length) * 100)
              : 0;

          this.patients = this.patients.map((row) => ({
            ...row,
            questionnaireToday: qMap.get(row.patientId) ?? false,
          }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.questionnaireCompliancePct = null;
          this.cdr.markForCheck();
        },
      });
  }

  private formatLatest(v: VitalDto): string {
    const parts: string[] = [];
    if (v.heartRate != null) parts.push(`HR ${v.heartRate}`);
    if (v.temperature != null) parts.push(`${v.temperature}°C`);
    if (v.weight != null) parts.push(`${v.weight} kg`);
    if (parts.length === 0 && v.bloodPressure?.trim())
      parts.push(v.bloodPressure.trim());
    const t = new Date(v.recordedAt).toLocaleString();
    return parts.length ? `${parts.join(' · ')} · ${t}` : t;
  }

  private rebuildChartAndTrend(): void {
    this.vitalChartOptions = null;
    this.trendInsight = null;

    if (!this.selectedPatientId) return;

    const cutoff = Date.now() - this.rangeDays * 86_400_000;
    const list = this.allVitals
      .filter(
        (v) =>
          v.patientId === this.selectedPatientId &&
          new Date(v.recordedAt).getTime() >= cutoff,
      )
      .sort(
        (a, b) =>
          new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      );

    if (list.length === 0) return;

    const labels = list.map((v) =>
      new Date(v.recordedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

    if (this.selectedParameter === 'heartRate') {
      const data = list.map((v) => v.heartRate ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: 'HR (bpm)', data }], 'bpm', ['#d32f2f']);
      this.trendInsight = this.computeTrendInsight(
        list.map((v) => v.heartRate ?? NaN).filter((n) => !Number.isNaN(n)),
        'bpm',
      );
      return;
    }
    if (this.selectedParameter === 'temperature') {
      const data = list.map((v) => v.temperature ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: '°C', data }], '°C', ['#e53935']);
      this.trendInsight = this.computeTrendInsight(
        list.map((v) => v.temperature ?? NaN).filter((n) => !Number.isNaN(n)),
        '°C',
      );
      return;
    }
    if (this.selectedParameter === 'weight') {
      const data = list.map((v) => v.weight ?? null);
      this.vitalChartOptions = this.lineChart(labels, [{ name: 'kg', data }], 'kg', ['#7b1fa2']);
      this.trendInsight = this.computeTrendInsight(
        list.map((v) => v.weight ?? NaN).filter((n) => !Number.isNaN(n)),
        'kg',
      );
      return;
    }

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
    const validSys = sys.filter(
      (n): n is number => typeof n === 'number' && !Number.isNaN(n),
    );
    this.trendInsight = this.computeTrendInsight(validSys, 'mmHg systolic');
  }

  parseBp(s: string | undefined): { sys: number; dia: number } | null {
    if (!s?.trim()) return null;
    const m = s.trim().match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return null;
    return { sys: +m[1], dia: +m[2] };
  }

  private lineChart(
    categories: string[],
    series: { name: string; data: (number | null)[] }[],
    yTitle: string,
    colors: string[],
  ): any {
    return {
      series,
      chart: { type: 'line', height: 320, toolbar: { show: true }, zoom: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      dataLabels: { enabled: false },
      markers: { size: 4 },
      colors,
      xaxis: { categories, labels: { rotate: -45 } },
      yaxis: { title: { text: yTitle } },
      legend: { position: 'top' },
      grid: { borderColor: '#f1f1f1' },
    };
  }

  computeTrendInsight(values: number[], unit: string): string | null {
    if (values.length < 2) return null;
    const mid = Math.floor(values.length / 2);
    const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
    const a1 = avg(values.slice(0, mid));
    const a2 = avg(values.slice(mid));
    const delta = a2 - a1;
    const rel = a1 !== 0 ? (delta / a1) * 100 : 0;
    if (Math.abs(rel) < 3) return `Stable around ${a2.toFixed(1)} ${unit}.`;
    if (delta > 0) return `Upward pattern: avg ${a2.toFixed(1)} vs ${a1.toFixed(1)} ${unit} earlier.`;
    return `Downward pattern: avg ${a2.toFixed(1)} vs ${a1.toFixed(1)} ${unit} earlier.`;
  }

  openSendQuestionnaireDialog(row: MonitoredPatientRow): void {
    const dialogRef = this.dialog.open(SendQuestionnaireDialog, {
      width: '500px',
      data: { patientName: row.name, patientId: row.patientId },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((templateId) => {
        if (!templateId) return;
        const doctorId = this.userIdFromAccessToken();
        if (!doctorId) return;

        this.questionnaireApi
          .createInstance({ templateId, patientId: row.patientId, doctorId })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.patients = this.patients.map((p) =>
                p.patientId === row.patientId
                  ? { ...p, questionnaireToday: true }
                  : p,
              );
              this.snackBar.open('Questionnaire envoyé avec succès', 'OK', { duration: 3000 });
              this.cdr.markForCheck();
            },
            error: () => {
              this.snackBar.open("Échec de l'envoi du questionnaire", 'OK', { duration: 3000 });
            },
          });
      });
  }

  viewResponses(row: MonitoredPatientRow): void {
    this.snackBar.open('Review feature coming soon', 'OK', { duration: 3000 });
  }
}
