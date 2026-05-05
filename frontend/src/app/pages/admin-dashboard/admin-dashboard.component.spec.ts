import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AuditApiService } from 'src/app/services/audit.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import { AlertsApiService } from 'src/app/services/alerts-api.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';
import { PatientService } from 'src/app/services/superadmin/patient.service';
import { RemindersApiService } from 'src/app/services/reminders-api.service';
import { VitalsApiService } from 'src/app/services/vitals-api.service';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';

describe('AdminDashboardComponent', () => {
  let component: AdminDashboardComponent;
  let fixture: ComponentFixture<AdminDashboardComponent>;
  let mockRouter: any;

  // Mocks
  const mockAuditService = {
    getStats: jasmine.createSpy('getStats').and.returnValue(of({ total: 0, last7days: [] })),
    getLogs: jasmine.createSpy('getLogs').and.returnValue(of([]))
  };

  const mockUsersService = {
    getAllUsers: jasmine.createSpy('getAllUsers').and.returnValue(of([
      { role: { name: 'Doctor' } },
      { role: { name: 'Nurse' } }
    ]))
  };

  const mockAlertsService = {
    getAlerts: jasmine.createSpy('getAlerts').and.returnValue(of([]))
  };

  const mockServiceService = {
    getServices: jasmine.createSpy('getServices').and.returnValue(of([]))
  };

  const mockPatientService = {
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of([]))
  };

  const mockRemindersService = {
    // If the component uses any methods directly from RemindersApiService, add them here
  };

  const mockVitalsService = {
    // If the component uses any methods directly from VitalsApiService, add them here
  };

  beforeEach(async () => {
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    await TestBed.configureTestingModule({
      imports: [
        AdminDashboardComponent, // Standalone component
        HttpClientTestingModule,
        RouterTestingModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: AuditApiService, useValue: mockAuditService },
        { provide: UsersApiService, useValue: mockUsersService },
        { provide: AlertsApiService, useValue: mockAlertsService },
        { provide: ServiceService, useValue: mockServiceService },
        { provide: PatientService, useValue: mockPatientService },
        { provide: RemindersApiService, useValue: mockRemindersService },
        { provide: VitalsApiService, useValue: mockVitalsService },
        { provide: Router, useValue: mockRouter },
        TranslateService
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(AdminDashboardComponent, {
      remove: { imports: [import('@angular/router').then(m => m.RouterModule) as any] },
      add: { imports: [RouterTestingModule] }
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize KPIs correctly after ngOnInit', () => {
    // ngOnInit is already called by fixture.detectChanges() in beforeEach
    const httpMock = TestBed.inject(HttpTestingController);
    httpMock.match(`http://localhost:3000/coordinator/auditor/reminders-overview`).forEach(req => req.flush({ stats: {}, reminders: [] }));
    httpMock.match(`http://localhost:3000/questionnaire-responses`).forEach(req => req.flush([]));
    httpMock.match(`http://localhost:3000/coordinator/auditor/service-staff`).forEach(req => req.flush([]));
    httpMock.match(`http://localhost:3000/coordinator/auditor/patients-overview`).forEach(req => req.flush([]));

    expect(mockUsersService.getAllUsers).toHaveBeenCalled();
    expect(mockAlertsService.getAlerts).toHaveBeenCalled();
    expect(mockServiceService.getServices).toHaveBeenCalled();
    expect(mockPatientService.getPatients).toHaveBeenCalled();
    expect(mockAuditService.getStats).toHaveBeenCalled();
    expect(mockAuditService.getLogs).toHaveBeenCalled();
    
    // Check if the user counts were processed
    expect(component.totalUsers).toBe(2);
    expect(component.totalDoctors).toBe(1);
    expect(component.totalNurses).toBe(1);
  });

  it('should handle keyboard shortcuts', () => {
    spyOn((component as any).router, 'navigate');
    const mockEvent = { code: 'KeyP', altKey: true, preventDefault: () => {}, stopPropagation: () => {} } as any;
    
    component.handleKeyboard(mockEvent);
    
    expect((component as any).router.navigate).toHaveBeenCalledWith(['/dashboard/admin/patients']);
  });

  it('should generate AI report and update aiReportText', () => {
    // We mock http client call specifically for the AI report endpoint since component uses HttpClient directly
    const httpMock = TestBed.inject(HttpTestingController);
    
    component.generateAiReport('daily');
    expect(component.aiReportLoading).toBeTrue();

    const req = httpMock.expectOne(`http://localhost:3000/coordinator/admin/ai-report`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ type: 'daily' });

    req.flush({ response: 'Test AI Report', generatedAt: '2026-05-01T12:00:00Z' });

    expect(component.aiReportText).toBe('Test AI Report');
    expect(component.aiReportLoading).toBeFalse();
  });
});
