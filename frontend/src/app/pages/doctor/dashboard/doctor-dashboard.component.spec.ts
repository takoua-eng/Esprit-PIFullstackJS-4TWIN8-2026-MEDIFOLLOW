import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { DoctorDashboardComponent } from './doctor-dashboard.component';
import { AlertsApiService } from 'src/app/services/alerts-api.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import { VitalsApiService, VitalDto } from 'src/app/services/vitals-api.service';
import { VitalParametersApiService, VitalParametersRaw } from 'src/app/services/vital-parameters-api.service';
import { QuestionnaireApiService } from 'src/app/services/questionnaire-api.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeVital = (overrides: Partial<VitalDto> = {}): VitalDto => ({
  _id: 'v1', patientId: 'p1', patientName: 'Alice', recordedBy: 'n1',
  recorderName: 'Nurse', entrySource: 'nurse',
  heartRate: 80, temperature: 37.0, weight: 70, bloodPressure: '120/80',
  recordedAt: new Date().toISOString(), verifiedAt: null, ...overrides,
});

describe('DoctorDashboardComponent', () => {
  let component: DoctorDashboardComponent;
  let fixture: ComponentFixture<DoctorDashboardComponent>;
  let alertsApi: jasmine.SpyObj<AlertsApiService>;
  let usersApi: jasmine.SpyObj<UsersApiService>;
  let vitalsApi: jasmine.SpyObj<VitalsApiService>;
  let vitalParametersApi: jasmine.SpyObj<VitalParametersApiService>;
  let questionnaireApi: jasmine.SpyObj<QuestionnaireApiService>;

  beforeEach(async () => {
    alertsApi = jasmine.createSpyObj('AlertsApiService', ['getAlerts', 'getOpenCount']);
    usersApi = jasmine.createSpyObj('UsersApiService', ['getPatients', 'getUserById']);
    vitalsApi = jasmine.createSpyObj('VitalsApiService', ['getVitals']);
    vitalParametersApi = jasmine.createSpyObj('VitalParametersApiService', ['getAll']);
    questionnaireApi = jasmine.createSpyObj('QuestionnaireApiService', [
      'hasRespondedToday', 'createInstance',
    ]);
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    alertsApi.getAlerts.and.returnValue(of([]));
    alertsApi.getOpenCount.and.returnValue(of({ count: 0 }));
    usersApi.getPatients.and.returnValue(of([]));
    usersApi.getUserById.and.returnValue(of({ _id: 'doc1', assignedPatients: [] } as any));
    vitalsApi.getVitals.and.returnValue(of([]));
    vitalParametersApi.getAll.and.returnValue(of([]));
    questionnaireApi.hasRespondedToday.and.returnValue(of(false));
    dialog.open.and.returnValue({ afterClosed: () => of(null) } as any);

    await TestBed.configureTestingModule({
      imports: [DoctorDashboardComponent],
      providers: [
        { provide: AlertsApiService, useValue: alertsApi },
        { provide: UsersApiService, useValue: usersApi },
        { provide: VitalsApiService, useValue: vitalsApi },
        { provide: VitalParametersApiService, useValue: vitalParametersApi },
        { provide: QuestionnaireApiService, useValue: questionnaireApi },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).overrideComponent(DoctorDashboardComponent, {
      set: { imports: [CommonModule, MockTranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading = true', () => {
    expect(component.loading).toBeTrue();
  });

  // ─── noDoctorSession ─────────────────────────────────────────────────────────

  describe('noDoctorSession', () => {
    it('should set noDoctorSession = true and stop loading when no token', () => {
      localStorage.removeItem('accessToken');
      component.ngOnInit();
      expect(component.noDoctorSession).toBeTrue();
      expect(component.loading).toBeFalse();
    });
  });

  // ─── mergeVitalSources() ─────────────────────────────────────────────────────

  describe('mergeVitalSources()', () => {
    const merge = (nurse: VitalDto[], params: VitalParametersRaw[]) =>
      (component as any).mergeVitalSources(nurse, params) as VitalDto[];

    it('should merge nurse vitals and patient parameters into one array', () => {
      const nurseVitals = [makeVital({ _id: 'v1', recordedAt: new Date(2000).toISOString() })];
      const params: VitalParametersRaw[] = [{
        _id: 'vp1', patientId: 'p2', heartRate: 90, temperature: 36.5,
        recordedAt: new Date(1000).toISOString(), recordedBy: 'p2',
      } as any];
      const result = merge(nurseVitals, params);
      expect(result).toHaveSize(2);
    });

    it('should sort merged results by recordedAt descending (newest first)', () => {
      const older = makeVital({ _id: 'v1', recordedAt: new Date(1000).toISOString() });
      const newer = makeVital({ _id: 'v2', recordedAt: new Date(2000).toISOString() });
      const result = merge([older, newer], []);
      expect(result[0]._id).toBe('v2');
    });

    it('should prefix patient parameter ids with "vp-"', () => {
      const params: VitalParametersRaw[] = [{
        _id: 'abc123', patientId: 'p2', heartRate: 90,
        recordedAt: new Date().toISOString(), recordedBy: 'p2',
      } as any];
      const result = merge([], params);
      expect(result[0]._id).toBe('vp-abc123');
    });
  });

  // ─── normalizeVitalParametersRow() ───────────────────────────────────────────

  describe('normalizeVitalParametersRow()', () => {
    const normalize = (raw: any) =>
      (component as any).normalizeVitalParametersRow(raw) as VitalDto;

    it('should build bloodPressure from systolic/diastolic when not present', () => {
      const raw = {
        _id: 'x', patientId: 'p1', bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80, recordedAt: new Date().toISOString(), recordedBy: 'p1',
      };
      const result = normalize(raw);
      expect(result.bloodPressure).toBe('120/80');
    });

    it('should use existing bloodPressure string when present', () => {
      const raw = {
        _id: 'x', patientId: 'p1', bloodPressure: '130/85',
        recordedAt: new Date().toISOString(), recordedBy: 'p1',
      };
      const result = normalize(raw);
      expect(result.bloodPressure).toBe('130/85');
    });

    it('should set entrySource to "patient"', () => {
      const raw = { _id: 'x', patientId: 'p1', recordedAt: new Date().toISOString(), recordedBy: 'p1' };
      expect(normalize(raw).entrySource).toBe('patient');
    });

    it('should extract firstName and lastName from populated patientId', () => {
      const raw = {
        _id: 'x',
        patientId: { _id: 'p1', firstName: 'Alice', lastName: 'Smith' },
        recordedAt: new Date().toISOString(), recordedBy: 'p1',
      };
      expect(normalize(raw).patientName).toBe('Alice Smith');
    });
  });

  // ─── computeTrendInsight() ───────────────────────────────────────────────────

  describe('computeTrendInsight()', () => {
    const trend = (values: number[], unit: string) =>
      (component as any).computeTrendInsight(values, unit) as string | null;

    it('should return null for fewer than 2 values', () =>
      expect(trend([80], 'bpm')).toBeNull());

    it('should return null for empty array', () =>
      expect(trend([], 'bpm')).toBeNull());

    it('should detect stable trend (<3% change)', () => {
      const values = [80, 80, 80, 80, 80, 80];
      expect(trend(values, 'bpm')).toContain('Stable');
    });

    it('should detect upward trend', () => {
      const values = [60, 60, 60, 100, 100, 100];
      expect(trend(values, 'bpm')).toContain('Upward');
    });
  });

  // ─── formatLatest() ──────────────────────────────────────────────────────────

  describe('formatLatest()', () => {
    const fmt = (v: Partial<VitalDto>) =>
      (component as any).formatLatest({ recordedAt: new Date().toISOString(), ...v }) as string;

    it('should include HR when heartRate is present', () =>
      expect(fmt({ heartRate: 75 })).toContain('HR 75'));

    it('should include temperature when present', () =>
      expect(fmt({ temperature: 37.1 })).toContain('37.1°C'));

    it('should include weight when present', () =>
      expect(fmt({ weight: 70 })).toContain('70 kg'));

    it('should include blood pressure when no other vitals', () =>
      expect(fmt({ bloodPressure: '120/80' })).toContain('120/80'));

    it('should return just the timestamp when no vital values present', () => {
      const result = fmt({});
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ─── parseBp() ───────────────────────────────────────────────────────────────

  describe('parseBp()', () => {
    const parse = (s: string | undefined) =>
      (component as any).parseBp(s) as { sys: number; dia: number } | null;

    it('should parse "120/80"', () =>
      expect(parse('120/80')).toEqual({ sys: 120, dia: 80 }));

    it('should parse "130 / 85" with spaces', () =>
      expect(parse('130 / 85')).toEqual({ sys: 130, dia: 85 }));

    it('should return null for empty string', () =>
      expect(parse('')).toBeNull());

    it('should return null for undefined', () =>
      expect(parse(undefined)).toBeNull());

    it('should return null for non-BP string', () =>
      expect(parse('hello')).toBeNull());
  });

  // ─── onChartFiltersChange() ───────────────────────────────────────────────────

  describe('onChartFiltersChange()', () => {
    it('should reset vitalChartOptions (rebuild from empty data)', () => {
      component.selectedPatientId = '';
      component.onChartFiltersChange();
      expect(component.vitalChartOptions).toBeNull();
    });
  });
});
