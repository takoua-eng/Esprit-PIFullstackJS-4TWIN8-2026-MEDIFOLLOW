import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { convertToParamMap } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { NurseMedicalFileComponent } from './nurse-medical-file.component';
import { UsersApiService } from 'src/app/services/users-api.service';
import { UploadApiService } from 'src/app/services/upload-api.service';
import { HospitalizationHandwritingApiService } from 'src/app/services/hospitalization-handwriting-api.service';
import { DiagnosisEntry } from 'src/app/services/users-api.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeEntry = (overrides: Partial<DiagnosisEntry> = {}): DiagnosisEntry => ({
  id: 'e1',
  admissionDate: '2024-01-15',
  dischargeDate: '2024-01-20',
  dischargeUnit: 'Cardiology ward',
  primaryDiagnosis: 'Hypertension',
  hospitalizationReason: 'High BP',
  secondaryDiagnoses: '',
  proceduresPerformed: '',
  dischargeSummaryNotes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('NurseMedicalFileComponent', () => {
  let component: NurseMedicalFileComponent;
  let fixture: ComponentFixture<NurseMedicalFileComponent>;
  let usersApi: jasmine.SpyObj<UsersApiService>;

  const activatedRouteMock = {
    queryParamMap: of(convertToParamMap({})),
    snapshot: { queryParamMap: convertToParamMap({}) },
  };

  beforeEach(async () => {
    usersApi = jasmine.createSpyObj('UsersApiService', [
      'getPatients', 'getAllUsers', 'getNurseDossier', 'putNurseDossier',
    ]);
    usersApi.getPatients.and.returnValue(of([]));
    usersApi.getAllUsers.and.returnValue(of([]));
    usersApi.getNurseDossier.and.returnValue(of(null));
    usersApi.putNurseDossier.and.returnValue(of({ updatedAt: new Date().toISOString() }));

    const uploadApi = jasmine.createSpyObj('UploadApiService', ['upload']);
    const hwApi = jasmine.createSpyObj('HospitalizationHandwritingApiService', ['parseImage']);
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const translate = jasmine.createSpyObj('TranslateService', ['instant']);
    translate.instant.and.callFake((k: string) => k);

    await TestBed.configureTestingModule({
      imports: [NurseMedicalFileComponent],
      providers: [
        { provide: UsersApiService, useValue: usersApi },
        { provide: UploadApiService, useValue: uploadApi },
        { provide: HospitalizationHandwritingApiService, useValue: hwApi },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: MatDialog, useValue: dialog },
        { provide: TranslateService, useValue: translate },
      ],
    }).overrideComponent(NurseMedicalFileComponent, {
      set: { imports: [CommonModule, MockTranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(NurseMedicalFileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── normalizeDate() ─────────────────────────────────────────────────────────

  describe('normalizeDate()', () => {
    const nd = (v: string) => (component as any).normalizeDate(v) as string;

    it('should pass through ISO format unchanged', () =>
      expect(nd('2024-01-15')).toBe('2024-01-15'));

    it('should convert DD/MM/YYYY to YYYY-MM-DD', () =>
      expect(nd('15/01/2024')).toBe('2024-01-15'));

    it('should convert DD-MM-YYYY to YYYY-MM-DD', () =>
      expect(nd('15-01-2024')).toBe('2024-01-15'));

    it('should convert DD.MM.YYYY to YYYY-MM-DD', () =>
      expect(nd('15.01.2024')).toBe('2024-01-15'));

    it('should return empty string for unrecognized format', () =>
      expect(nd('January 15 2024')).toBe(''));

    it('should return empty string for empty input', () =>
      expect(nd('')).toBe(''));

    it('should return empty string for whitespace-only input', () =>
      expect(nd('   ')).toBe(''));
  });

  // ─── toStoredMulti() / fromStoredMulti() ─────────────────────────────────────

  describe('toStoredMulti() / fromStoredMulti()', () => {
    const toMulti = (v: string[]) => (component as any).toStoredMulti(v) as string;
    const fromMulti = (v: string) => (component as any).fromStoredMulti(v) as string[];

    it('should join array with " | " separator', () =>
      expect(toMulti(['Penicillin', 'Latex'])).toBe('Penicillin | Latex'));

    it('should filter out empty values', () =>
      expect(toMulti(['Penicillin', '', 'Latex'])).toBe('Penicillin | Latex'));

    it('should return empty string for empty array', () =>
      expect(toMulti([])).toBe(''));

    it('should split stored multi-value string back to array', () =>
      expect(fromMulti('Penicillin | Latex')).toEqual(['Penicillin', 'Latex']));

    it('should return empty array for empty string', () =>
      expect(fromMulti('')).toEqual([]));

    it('should trim each value', () =>
      expect(fromMulti('  Penicillin  |  Latex  ')).toEqual(['Penicillin', 'Latex']));

    it('should round-trip correctly', () => {
      const original = ['NSAIDs', 'Pollen', 'Dust mites'];
      expect(fromMulti(toMulti(original))).toEqual(original);
    });
  });

  // ─── entryHasClinicalContent() ───────────────────────────────────────────────

  describe('entryHasClinicalContent()', () => {
    const has = (e: Partial<DiagnosisEntry>) =>
      (component as any).entryHasClinicalContent(e) as boolean;

    it('should return true when admissionDate is set', () =>
      expect(has({ admissionDate: '2024-01-01' })).toBeTrue());

    it('should return true when primaryDiagnosis is set', () =>
      expect(has({ primaryDiagnosis: 'Hypertension' })).toBeTrue());

    it('should return false when all fields are empty', () =>
      expect(has({
        admissionDate: '', dischargeDate: '', dischargeUnit: '',
        primaryDiagnosis: '', hospitalizationReason: '',
        secondaryDiagnoses: '', proceduresPerformed: '', dischargeSummaryNotes: '',
      })).toBeFalse());

    it('should return false for entry with only whitespace', () =>
      expect(has({ primaryDiagnosis: '   ' })).toBeFalse());
  });

  // ─── matchDischargeUnitToOption() ────────────────────────────────────────────

  describe('matchDischargeUnitToOption()', () => {
    const match = (v: string) =>
      (component as any).matchDischargeUnitToOption(v) as string;

    it('should match exact value', () =>
      expect(match('ICU')).toBe('ICU'));

    it('should match case-insensitively', () =>
      expect(match('icu')).toBe('ICU'));

    it('should return partial match', () =>
      expect(match('cardiology')).toBe('Cardiology ward'));

    it('should return empty string for no match', () =>
      expect(match('Rheumatology')).toBe(''));

    it('should return empty string for empty input', () =>
      expect(match('')).toBe(''));
  });

  // ─── formatPdfDate() ─────────────────────────────────────────────────────────

  describe('formatPdfDate()', () => {
    const fmt = (v: string) => (component as any).formatPdfDate(v) as string;

    it('should convert ISO to DD/MM/YYYY', () =>
      expect(fmt('2024-01-15')).toBe('15/01/2024'));

    it('should return "-" for empty string', () =>
      expect(fmt('')).toBe('-'));

    it('should return original value for unrecognized format', () =>
      expect(fmt('Jan 15 2024')).toBe('Jan 15 2024'));
  });

  // ─── mapHeaderLabelToKey() ───────────────────────────────────────────────────

  describe('mapHeaderLabelToKey()', () => {
    const map = (v: string) => (component as any).mapHeaderLabelToKey(v) as string | null;

    it('should map "Admission date" to admissionDate', () =>
      expect(map('Admission date')).toBe('admissionDate'));

    it('should map "Discharge date" to dischargeDate', () =>
      expect(map('Discharge date')).toBe('dischargeDate'));

    it('should map "Discharge unit" to dischargeUnit', () =>
      expect(map('Discharge unit')).toBe('dischargeUnit'));

    it('should map "Primary diagnosis" to primaryDiagnosis', () =>
      expect(map('Primary diagnosis')).toBe('primaryDiagnosis'));

    it('should map "Secondary diagnoses" to secondaryDiagnoses', () =>
      expect(map('Secondary diagnoses')).toBe('secondaryDiagnoses'));

    it('should map French label "Diagnostic principal" to primaryDiagnosis', () =>
      expect(map('Diagnostic principal')).toBe('primaryDiagnosis'));

    it('should return null for unknown label', () =>
      expect(map('Unknown section')).toBeNull());
  });

  // ─── Edit state machine ───────────────────────────────────────────────────────

  describe('addVisit()', () => {
    it('should add a new entry and set it as editing', () => {
      component.diagnosisEntries = [];
      component.addVisit();
      expect(component.diagnosisEntries).toHaveSize(1);
      expect(component.editingEntryId).toBe(component.diagnosisEntries[0].id);
    });

    it('should commit the current edit before adding a new one', () => {
      component.diagnosisEntries = [makeEntry({ id: 'existing' })];
      component.editingEntryId = 'existing';
      (component as any).editSnapshot = makeEntry({ id: 'existing' });
      component.addVisit();
      expect(component.diagnosisEntries.length).toBe(2);
      expect(component.editingEntryId).not.toBe('existing');
    });
  });

  describe('startEdit()', () => {
    it('should set editingEntryId and save snapshot', () => {
      const entry = makeEntry({ id: 'e1' });
      component.diagnosisEntries = [entry];
      component.startEdit(entry);
      expect(component.editingEntryId).toBe('e1');
      expect((component as any).editSnapshot).toEqual(entry);
    });
  });

  describe('cancelEdit()', () => {
    it('should remove a pending new entry when cancelled', () => {
      component.diagnosisEntries = [makeEntry({ id: 'new1' })];
      component.editingEntryId = 'new1';
      (component as any).pendingNewEntryId = 'new1';
      component.cancelEdit();
      expect(component.diagnosisEntries).toHaveSize(0);
      expect(component.editingEntryId).toBeNull();
    });

    it('should restore snapshot for an existing entry', () => {
      const original = makeEntry({ id: 'e1', primaryDiagnosis: 'Original' });
      const modified = { ...original, primaryDiagnosis: 'Modified' };
      component.diagnosisEntries = [modified];
      component.editingEntryId = 'e1';
      (component as any).editSnapshot = original;
      component.cancelEdit();
      expect(component.diagnosisEntries[0].primaryDiagnosis).toBe('Original');
      expect(component.editingEntryId).toBeNull();
    });
  });

  describe('commitEdit()', () => {
    it('should clear editingEntryId and update updatedAt', () => {
      const entry = makeEntry({ id: 'e1' });
      component.diagnosisEntries = [entry];
      component.editingEntryId = 'e1';
      component.commitEdit();
      expect(component.editingEntryId).toBeNull();
      expect((component as any).pendingNewEntryId).toBeNull();
    });

    it('should do nothing when no entry is being edited', () => {
      component.editingEntryId = null;
      expect(() => component.commitEdit()).not.toThrow();
    });
  });

  describe('deleteVisit()', () => {
    it('should remove the entry with the given id', () => {
      component.diagnosisEntries = [makeEntry({ id: 'e1' }), makeEntry({ id: 'e2' })];
      component.deleteVisit('e1');
      expect(component.diagnosisEntries).toHaveSize(1);
      expect(component.diagnosisEntries[0].id).toBe('e2');
    });

    it('should clear editingEntryId when the edited entry is deleted', () => {
      component.diagnosisEntries = [makeEntry({ id: 'e1' })];
      component.editingEntryId = 'e1';
      component.deleteVisit('e1');
      expect(component.editingEntryId).toBeNull();
    });
  });

  // ─── addMedication() / removeMedication() ────────────────────────────────────

  describe('addMedication()', () => {
    it('should add an empty medication row', () => {
      component.medicationsList = [];
      component.addMedication();
      expect(component.medicationsList).toHaveSize(1);
      expect(component.medicationsList[0].medication).toBe('');
    });
  });

  describe('removeMedication()', () => {
    it('should remove the medication at the given index', () => {
      component.medicationsList = [
        { medication: 'Aspirin', dose: '100mg' },
        { medication: 'Metformin', dose: '500mg' },
      ];
      component.removeMedication(0);
      expect(component.medicationsList).toHaveSize(1);
      expect(component.medicationsList[0].medication).toBe('Metformin');
    });
  });
});
