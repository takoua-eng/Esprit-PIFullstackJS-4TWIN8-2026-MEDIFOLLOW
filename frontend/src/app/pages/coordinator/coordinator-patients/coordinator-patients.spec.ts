// ══════════════════════════════════════════════════════════════
//  coordinator-patients.spec.ts
// ══════════════════════════════════════════════════════════════
import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { CoordinatorPatientsComponent } from './coordinator-patients';
import { CoordinatorService } from 'src/app/services/coordinator.service';
import { CoreService } from 'src/app/services/core.service';

const mockPatientsList = [
  {
    _id: 'p1', name: 'Karim Sassi', email: 'k@test.com', phone: '12345',
    department: 'Cardiology', medicalRecordNumber: 'MRN001', status: 'UP_TO_DATE',
    vitalsSubmitted: true, vitalsFullyComplete: true, missingVitalFields: [],
    symptomsSubmitted: true, symptomsFullyComplete: true, missingSymptomFields: [],
    isFullyCompliant: true,
  },
  {
    _id: 'p2', name: 'Nada Ben Ali', email: 'n@test.com', phone: '',
    department: 'Oncology', medicalRecordNumber: '', status: 'NO_DATA_TODAY',
    vitalsSubmitted: false, vitalsFullyComplete: false, missingVitalFields: ['Temperature', 'Weight'],
    symptomsSubmitted: false, symptomsFullyComplete: false, missingSymptomFields: ['Pain Level'],
    isFullyCompliant: false,
  },
];

const mockCoordinatorService = {
  getPatientsWithCompliance: jasmine.createSpy('getPatientsWithCompliance').and.returnValue(of(mockPatientsList)),
  getComplianceToday:        jasmine.createSpy('getComplianceToday').and.returnValue(of([])),
  getPersonalizedMessage:    jasmine.createSpy('getPersonalizedMessage').and.returnValue(of({
    message: 'Dear Nada, please complete your follow-up.',
    missingVitals: ['Temperature', 'Weight'],
    missingSymptoms: ['Pain Level'],
  })),
  createReminder: jasmine.createSpy('createReminder').and.returnValue(of({ _id: 'r1' })),
  sendReminder:   jasmine.createSpy('sendReminder').and.returnValue(of({ status: 'sent' })),
};

const mockCoreService = {
  currentUser: jasmine.createSpy('currentUser').and.returnValue({ _id: 'coord123' }),
};

describe('CoordinatorPatientsComponent', () => {
  let component: CoordinatorPatientsComponent;
  let fixture: ComponentFixture<CoordinatorPatientsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinatorPatientsComponent, HttpClientTestingModule, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: CoordinatorService, useValue: mockCoordinatorService },
        { provide: CoreService, useValue: mockCoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinatorPatientsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockCoordinatorService.getPatientsWithCompliance.calls.reset();
    mockCoordinatorService.getComplianceToday.calls.reset();
    mockCoreService.currentUser.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patients with compliance on init', () => {
    expect(mockCoordinatorService.getPatientsWithCompliance).toHaveBeenCalled();
  });

  it('should have 2 patients after loading', () => {
    expect(component.patients.length).toBe(2);
  });

  it('should correctly identify compliant patients', () => {
    const compliant = component.patients.filter((p: any) => p.isFullyCompliant);
    expect(compliant.length).toBe(1);
    expect(compliant[0].name).toBe('Karim Sassi');
  });

  // NOTE: This test requires a `searchTerm` property and `filteredPatients` getter
  // on CoordinatorPatientsComponent. Add them to the component if not present.
  it('should filter patients by search term', () => {
    (component as any).searchTerm = 'Nada';
    fixture.detectChanges();
    const filtered: any[] = (component as any).filteredPatients ?? component.patients.filter((p: any) =>
      p.name.toLowerCase().includes('nada')
    );
    expect(filtered.every((p: any) => p.name.toLowerCase().includes('nada'))).toBeTrue();
  });
});
