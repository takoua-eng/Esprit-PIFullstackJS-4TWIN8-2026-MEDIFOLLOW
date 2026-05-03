import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuditorDashboardComponent } from './auditor-dashboard.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { API_BASE_URL } from 'src/app/core/api.config';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter } from '@angular/router';
describe('AuditorDashboardComponent', () => {
  let component: AuditorDashboardComponent;
  let fixture: ComponentFixture<AuditorDashboardComponent>;
  let httpMock: HttpTestingController;

  const snackBarMock = { open: jasmine.createSpy('open'), dismiss: jasmine.createSpy('dismiss') };

  function flushInit(http: HttpTestingController) {
    http.match(r => r.url.includes('audit-report')).forEach(r => r.flush({ report: null, generatedAt: null }));
    http.match(r => r.url.includes('patients-overview')).forEach(r => r.flush([]));
    http.match(r => r.url.includes('performance')).forEach(r => r.flush([]));
    http.match(r => r.url.includes('reminders-overview')).forEach(r => r.flush({ stats: {}, reminders: [] }));
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditorDashboardComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        provideRouter([]),
        { provide: MatSnackBar, useValue: snackBarMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => { httpMock.verify(); });

  it('should create', () => {
    flushInit(httpMock);
    expect(component).toBeTruthy();
  });

  it('should load AI audit report', () => {
    // flush the interval-triggered requests first
    httpMock.match(r => r.url.includes('patients-overview') || r.url.includes('performance') || r.url.includes('reminders-overview'))
      .forEach(r => r.flush([]));

    const aiReq = httpMock.expectOne(`${API_BASE_URL}/ai/audit-report`);
    expect(aiReq.request.method).toBe('POST');
    aiReq.flush({
      report: { riskScore: 80, riskLevel: 'HIGH', resume: 'Audit report', alertes: ['Alert 1'], risques: ['Risk 1'], interpretation: 'Interpretation', actions: ['Action 1'], topUsers: ['User 1'] },
      generatedAt: '2026-05-02',
    });

    expect(component.aiAuditReport).toBeTruthy();
    expect(component.aiAuditGeneratedAt).toBe('2026-05-02');
    expect(component.aiAuditLoading).toBeFalse();
  });

  it('should load dashboard statistics', fakeAsync(() => {
    httpMock.expectOne(`${API_BASE_URL}/ai/audit-report`).flush({ report: null, generatedAt: null });
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/patients-overview`).flush([
      { status: 'OK' }, { status: 'OK' }, { status: 'INCOMPLETE' }, { status: 'NO DATA' },
    ]);
    httpMock.expectOne(`${API_BASE_URL}/coordinator/all/performance`).flush([
      { name: 'Coord 1', patientCount: 10, completenessRate: 80, remindersToday: 2, remindersSent: 20 },
      { name: 'Coord 2', patientCount: 20, completenessRate: 60, remindersToday: 3, remindersSent: 15 },
    ]);
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).flush({
      stats: { total: 100, sentCount: 90, successRate: 90, avgDelayMin: 45 }, reminders: [],
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
    flushInit(httpMock);
    component.totalPatients = 10; component.okPatients = 7;
    expect(component.okPct).toBe(70);
  });

  it('should calculate incomplete percentage', () => {
    flushInit(httpMock);
    component.totalPatients = 10; component.incompletePatients = 2;
    expect(component.incompletePct).toBe(20);
  });

  it('should calculate no data percentage', () => {
    flushInit(httpMock);
    component.totalPatients = 10; component.noDataPatients = 1;
    expect(component.noDataPct).toBe(10);
  });

  it('should return delay label in minutes', () => {
    flushInit(httpMock);
    expect(component.delayLabel(30)).toBe('30m');
  });

  it('should return delay label in hours', () => {
    flushInit(httpMock);
    expect(component.delayLabel(130)).toBe('2h 10m');
  });

  it('should return dash if delay is null', () => {
    flushInit(httpMock);
    expect(component.delayLabel(null)).toBe('—');
  });

  it('should unsubscribe on destroy', () => {
    flushInit(httpMock);
    const unsubscribeSpy = spyOn(component['sub'] as any, 'unsubscribe');
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
