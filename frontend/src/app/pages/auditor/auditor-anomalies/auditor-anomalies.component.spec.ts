import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuditorAnomaliesComponent } from './auditor-anomalies.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
describe('AuditorAnomaliesComponent', () => {
  let component: AuditorAnomaliesComponent;
  let fixture: ComponentFixture<AuditorAnomaliesComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditorAnomaliesComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [...TABLER_TEST_PROVIDERS],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorAnomaliesComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    // flush the HTTP call triggered by ngOnInit
    const req = httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview'));
    req.flush([]);
    expect(component).toBeTruthy();
  });

  it('should load anomalies from API', () => {
    fixture.detectChanges();

    const mockPatients = [
      {
        _id: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001',
        service: 'Cardiology', coordinatorName: 'Ahmed',
        vitalsToday: false, symptomsToday: false, status: 'NO DATA',
      },
      {
        _id: '2', name: 'Ali', email: 'ali@test.com', mrn: 'MRN002',
        service: 'Neurology', coordinatorName: 'Sami',
        vitalsToday: true, symptomsToday: false, status: 'MISSING SYMPTOMS',
      },
    ];

    const req = httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview'));
    expect(req.request.method).toBe('GET');
    req.flush(mockPatients);

    expect(component.allAnomalies.length).toBe(2);
    expect(component.highCount).toBe(1);
    expect(component.mediumCount).toBe(1);
    expect(component.loading).toBeFalse();
  });

  it('should filter HIGH anomalies', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview')).flush([]);

    component.allAnomalies = [
      { patientId: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001', service: 'Cardiology', coordinatorName: 'Ahmed', vitalsToday: false, symptomsToday: false, issue: 'Missing data', severity: 'HIGH' },
      { patientId: '2', name: 'Ali',  email: 'ali@test.com',  mrn: 'MRN002', service: 'Neurology',  coordinatorName: 'Sami',  vitalsToday: true,  symptomsToday: false, issue: 'Symptoms missing', severity: 'MEDIUM' },
    ];
    component.filterSeverity = 'HIGH';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].severity).toBe('HIGH');
  });

  it('should filter MEDIUM anomalies', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview')).flush([]);

    component.allAnomalies = [
      { patientId: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001', service: 'Cardiology', coordinatorName: 'Ahmed', vitalsToday: false, symptomsToday: false, issue: 'Missing data', severity: 'HIGH' },
      { patientId: '2', name: 'Ali',  email: 'ali@test.com',  mrn: 'MRN002', service: 'Neurology',  coordinatorName: 'Sami',  vitalsToday: true,  symptomsToday: false, issue: 'Symptoms missing', severity: 'MEDIUM' },
    ];
    component.filterSeverity = 'MEDIUM';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].severity).toBe('MEDIUM');
  });

  it('should search anomaly by name', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview')).flush([]);

    component.allAnomalies = [
      { patientId: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001', service: 'Cardiology', coordinatorName: 'Ahmed', vitalsToday: false, symptomsToday: false, issue: 'Missing data', severity: 'HIGH' },
    ];
    component.searchText = 'Nada';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
  });

  it('should search anomaly by email', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview')).flush([]);

    component.allAnomalies = [
      { patientId: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001', service: 'Cardiology', coordinatorName: 'Ahmed', vitalsToday: false, symptomsToday: false, issue: 'Missing data', severity: 'HIGH' },
    ];
    component.searchText = 'nada@test.com';
    component.applyFilters();

    expect(component.filtered.length).toBe(1);
  });

  it('should update search text on onSearch()', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/coordinator/auditor/patients-overview')).flush([]);

    const event = { target: { value: 'Nada' } } as unknown as Event;
    component.onSearch(event);

    expect(component.searchText).toBe('Nada');
  });

  it('should return HIGH severity color', () => {
    expect(component.severityColor('HIGH')).toBe('#d63031');
  });

  it('should return MEDIUM severity color', () => {
    expect(component.severityColor('MEDIUM')).toBe('#fdcb6e');
  });

  it('should calculate highCount correctly', () => {
    component.allAnomalies = [
      { patientId: '1', name: 'Nada', email: 'nada@test.com', mrn: 'MRN001', service: 'Cardiology', coordinatorName: 'Ahmed', vitalsToday: false, symptomsToday: false, issue: 'Missing data', severity: 'HIGH' },
    ];
    expect(component.highCount).toBe(1);
  });

  it('should calculate mediumCount correctly', () => {
    component.allAnomalies = [
      { patientId: '2', name: 'Ali', email: 'ali@test.com', mrn: 'MRN002', service: 'Neurology', coordinatorName: 'Sami', vitalsToday: true, symptomsToday: false, issue: 'Symptoms missing', severity: 'MEDIUM' },
    ];
    expect(component.mediumCount).toBe(1);
  });
});
