import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditorAnomaliesComponent } from './auditor-anomalies.component';
import {
  HttpClientTestingModule,
  HttpTestingController
} from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AuditorAnomaliesComponent', () => {
  let component: AuditorAnomaliesComponent;
  let fixture: ComponentFixture<AuditorAnomaliesComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuditorAnomaliesComponent,
        HttpClientTestingModule,
        NoopAnimationsModule
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorAnomaliesComponent);
    component = fixture.componentInstance;

    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─────────────────────────────────────────────
  // Component creation
  // ─────────────────────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // Load anomalies from API
  // ─────────────────────────────────────────────
  it('should load anomalies from API', () => {

    const mockPatients = [
      {
        _id: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        status: 'NO DATA'
      },
      {
        _id: '2',
        name: 'Ali',
        email: 'ali@test.com',
        mrn: 'MRN002',
        service: 'Neurology',
        coordinatorName: 'Sami',
        vitalsToday: true,
        symptomsToday: false,
        status: 'MISSING SYMPTOMS'
      }
    ];

    const req = httpMock.expectOne(req =>
      req.url.includes('/coordinator/auditor/patients-overview')
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockPatients);

    expect(component.allAnomalies.length).toBe(2);

    expect(component.highCount).toBe(1);

    expect(component.mediumCount).toBe(1);

    expect(component.loading).toBeFalse();
  });

  // ─────────────────────────────────────────────
  // Filter HIGH severity
  // ─────────────────────────────────────────────
  it('should filter HIGH anomalies', () => {

    component.allAnomalies = [
      {
        patientId: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        issue: 'Missing data',
        severity: 'HIGH'
      },
      {
        patientId: '2',
        name: 'Ali',
        email: 'ali@test.com',
        mrn: 'MRN002',
        service: 'Neurology',
        coordinatorName: 'Sami',
        vitalsToday: true,
        symptomsToday: false,
        issue: 'Symptoms missing',
        severity: 'MEDIUM'
      }
    ];

    component.filterSeverity = 'HIGH';

    component.applyFilters();

    expect(component.filtered.length).toBe(1);

    expect(component.filtered[0].severity).toBe('HIGH');
  });

  // ─────────────────────────────────────────────
  // Filter MEDIUM severity
  // ─────────────────────────────────────────────
  it('should filter MEDIUM anomalies', () => {

    component.allAnomalies = [
      {
        patientId: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        issue: 'Missing data',
        severity: 'HIGH'
      },
      {
        patientId: '2',
        name: 'Ali',
        email: 'ali@test.com',
        mrn: 'MRN002',
        service: 'Neurology',
        coordinatorName: 'Sami',
        vitalsToday: true,
        symptomsToday: false,
        issue: 'Symptoms missing',
        severity: 'MEDIUM'
      }
    ];

    component.filterSeverity = 'MEDIUM';

    component.applyFilters();

    expect(component.filtered.length).toBe(1);

    expect(component.filtered[0].severity).toBe('MEDIUM');
  });

  // ─────────────────────────────────────────────
  // Search by name
  // ─────────────────────────────────────────────
  it('should search anomaly by name', () => {

    component.allAnomalies = [
      {
        patientId: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        issue: 'Missing data',
        severity: 'HIGH'
      }
    ];

    component.searchText = 'Nada';

    component.applyFilters();

    expect(component.filtered.length).toBe(1);
  });

  // ─────────────────────────────────────────────
  // Search by email
  // ─────────────────────────────────────────────
  it('should search anomaly by email', () => {

    component.allAnomalies = [
      {
        patientId: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        issue: 'Missing data',
        severity: 'HIGH'
      }
    ];

    component.searchText = 'nada@test.com';

    component.applyFilters();

    expect(component.filtered.length).toBe(1);
  });

  // ─────────────────────────────────────────────
  // onSearch
  // ─────────────────────────────────────────────
  it('should update search text on onSearch()', () => {

    const event = {
      target: {
        value: 'Nada'
      }
    } as unknown as Event;

    component.onSearch(event);

    expect(component.searchText).toBe('Nada');
  });

  // ─────────────────────────────────────────────
  // severityColor
  // ─────────────────────────────────────────────
  it('should return HIGH severity color', () => {
    expect(component.severityColor('HIGH')).toBe('#d63031');
  });

  it('should return MEDIUM severity color', () => {
    expect(component.severityColor('MEDIUM')).toBe('#fdcb6e');
  });

  // ─────────────────────────────────────────────
  // Count getters
  // ─────────────────────────────────────────────
  it('should calculate highCount correctly', () => {

    component.allAnomalies = [
      {
        patientId: '1',
        name: 'Nada',
        email: 'nada@test.com',
        mrn: 'MRN001',
        service: 'Cardiology',
        coordinatorName: 'Ahmed',
        vitalsToday: false,
        symptomsToday: false,
        issue: 'Missing data',
        severity: 'HIGH'
      }
    ];

    expect(component.highCount).toBe(1);
  });

  it('should calculate mediumCount correctly', () => {

    component.allAnomalies = [
      {
        patientId: '2',
        name: 'Ali',
        email: 'ali@test.com',
        mrn: 'MRN002',
        service: 'Neurology',
        coordinatorName: 'Sami',
        vitalsToday: true,
        symptomsToday: false,
        issue: 'Symptoms missing',
        severity: 'MEDIUM'
      }
    ];

    expect(component.mediumCount).toBe(1);
  });

});