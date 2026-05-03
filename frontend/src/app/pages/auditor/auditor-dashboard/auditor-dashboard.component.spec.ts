// auditor-dashboard.component.spec.ts

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuditorDashboardComponent } from './auditor-dashboard.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { API_BASE_URL } from 'src/app/core/api.config';

describe('AuditorDashboardComponent', () => {
  let component: AuditorDashboardComponent;
  let fixture: ComponentFixture<AuditorDashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuditorDashboardComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load AI audit report', () => {
    const aiReq = httpMock.expectOne(`${API_BASE_URL}/ai/audit-report`);

    expect(aiReq.request.method).toBe('POST');

    aiReq.flush({
      report: {
        riskScore: 80,
        riskLevel: 'HIGH',
        resume: 'Audit report',
        alertes: ['Alert 1'],
        risques: ['Risk 1'],
        interpretation: 'Interpretation',
        actions: ['Action 1'],
        topUsers: ['User 1'],
      },
      generatedAt: '2026-05-02',
    });

    expect(component.aiAuditReport).toBeTruthy();
    expect(component.aiAuditGeneratedAt).toBe('2026-05-02');
    expect(component.aiAuditLoading).toBeFalse();
  });

  it('should load dashboard statistics', fakeAsync(() => {

    // AI request
    const aiReq = httpMock.expectOne(`${API_BASE_URL}/ai/audit-report`);
    aiReq.flush({
      report: null,
      generatedAt: null,
    });

    // Patients request
    const patientsReq = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/auditor/patients-overview`
    );

    patientsReq.flush([
      { status: 'OK' },
      { status: 'OK' },
      { status: 'INCOMPLETE' },
      { status: 'NO DATA' },
    ]);

    // Coordinators request
    const coordinatorsReq = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/all/performance`
    );

    coordinatorsReq.flush([
      {
        name: 'Coord 1',
        patientCount: 10,
        completenessRate: 80,
        remindersToday: 2,
        remindersSent: 20,
      },
      {
        name: 'Coord 2',
        patientCount: 20,
        completenessRate: 60,
        remindersToday: 3,
        remindersSent: 15,
      },
    ]);

    // Reminders request
    const remindersReq = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/auditor/reminders-overview`
    );

    remindersReq.flush({
      stats: {
        total: 100,
        sentCount: 90,
        successRate: 90,
        avgDelayMin: 45,
      },
      reminders: [],
    });

    tick();

    expect(component.totalPatients).toBe(4);
    expect(component.okPatients).toBe(2);
    expect(component.incompletePatients).toBe(1);
    expect(component.noDataPatients).toBe(1);
    expect(component.complianceRate).toBe(50);

    expect(component.totalCoordinators).toBe(2);
    expect(component.avgPatientsPerCoord).toBe(15);
    expect(component.avgCompleteness).toBe(70);
    expect(component.remindersToday).toBe(5);

    expect(component.totalReminders).toBe(100);
    expect(component.sentReminders).toBe(90);
    expect(component.successRate).toBe(90);
    expect(component.avgDelayMin).toBe(45);

    expect(component.topCoordinators.length).toBe(2);
  }));

  it('should calculate ok percentage', () => {
    component.totalPatients = 10;
    component.okPatients = 7;

    expect(component.okPct).toBe(70);
  });

  it('should calculate incomplete percentage', () => {
    component.totalPatients = 10;
    component.incompletePatients = 2;

    expect(component.incompletePct).toBe(20);
  });

  it('should calculate no data percentage', () => {
    component.totalPatients = 10;
    component.noDataPatients = 1;

    expect(component.noDataPct).toBe(10);
  });

  it('should return delay label in minutes', () => {
    expect(component.delayLabel(30)).toBe('30m');
  });

  it('should return delay label in hours', () => {
    expect(component.delayLabel(130)).toBe('2h 10m');
  });

  it('should return dash if delay is null', () => {
    expect(component.delayLabel(null)).toBe('—');
  });

  it('should unsubscribe on destroy', () => {
    const unsubscribeSpy = spyOn(
      component['sub'] as any,
      'unsubscribe'
    );

    component.ngOnDestroy();

    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});