// ══════════════════════════════════════════════════════════════
//  coordinator-patients.spec.ts
// ══════════════════════════════════════════════════════════════
import { ComponentFixture as PatientsFixture, TestBed as PatientsBed } from '@angular/core/testing';
import { HttpClientTestingModule as PatientsHttp } from '@angular/common/http/testing';
import { NoopAnimationsModule as PatientsAnim } from '@angular/platform-browser/animations';
import { of as patientsOf } from 'rxjs';

import { CoordinatorPatients } from './coordinator-patients';
import { CoordinatorService as PatientsCoordService } from 'src/app/services/coordinator.service';
import { CoreService as PatientsCoreService } from 'src/app/services/core.service';

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

const mockPatientsCoordService = {
  getPatientsWithCompliance: jest.fn().mockReturnValue(patientsOf(mockPatientsList)),
  getPersonalizedMessage: jest.fn().mockReturnValue(patientsOf({
    message: 'Dear Nada, please complete your follow-up.',
    missingVitals: ['Temperature', 'Weight'],
    missingSymptoms: ['Pain Level'],
  })),
  createReminder: jest.fn().mockReturnValue(patientsOf({ _id: 'r1' })),
  sendReminder: jest.fn().mockReturnValue(patientsOf({ status: 'sent' })),
};

const mockPatientsCoreService = {
  currentUser: jest.fn().mockReturnValue({ _id: 'coord123' }),
};

describe('CoordinatorPatients', () => {
  let component: CoordinatorPatients;
  let fixture: PatientsFixture<CoordinatorPatients>;

  beforeEach(async () => {
    await PatientsBed.configureTestingModule({
      imports: [CoordinatorPatients, PatientsHttp, PatientsAnim],
      providers: [
        { provide: PatientsCoordService, useValue: mockPatientsCoordService },
        { provide: PatientsCoreService, useValue: mockPatientsCoreService },
      ],
    }).compileComponents();

    fixture = PatientsBed.createComponent(CoordinatorPatients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load patients with compliance on init', () => {
    expect(mockPatientsCoordService.getPatientsWithCompliance).toHaveBeenCalled();
  });

  it('should have 2 patients after loading', () => {
    expect(component.patients).toHaveLength(2);
  });

  it('should correctly identify compliant patients', () => {
    const compliant = component.patients.filter((p: any) => p.isFullyCompliant);
    expect(compliant).toHaveLength(1);
    expect(compliant[0].name).toBe('Karim Sassi');
  });

  it('should filter patients by search term', () => {
    component.searchTerm = 'Nada';
    fixture.detectChanges();
    const filtered = component.filteredPatients;
    expect(filtered.every((p: any) => p.name.toLowerCase().includes('nada'))).toBeTrue();
  });
});

