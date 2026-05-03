import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { SuperAdminDashboardComponent } from './superadmin-dashboard.component';
import { AuditApiService } from '../../../services/audit.service';
import { UsersApiService } from '../../../services/users-api.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { ServiceService } from '../../../services/superadmin/service.service';
import { PatientService } from '../../../services/superadmin/patient.service';
import { RemindersApiService } from '../../../services/reminders-api.service';
import { VitalsApiService } from '../../../services/vitals-api.service';
import { API_BASE_URL } from '../../../core/api.config';

describe('SuperAdminDashboardComponent', () => {
  let component: SuperAdminDashboardComponent;
  let fixture: ComponentFixture<SuperAdminDashboardComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SuperAdminDashboardComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
        RouterTestingModule,
        TranslateModule.forRoot(),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: AuditApiService, useValue: { getLogs: () => of([]), getStats: () => of({ last7days: [] }) } },
        { provide: UsersApiService, useValue: { getAllUsers: () => of([]) } },
        { provide: AlertsApiService, useValue: { getAlerts: () => of([]) } },
        { provide: ServiceService, useValue: { getServices: () => of([]) } },
        { provide: PatientService, useValue: { getPatients: () => of([]) } },
        { provide: RemindersApiService, useValue: { getReminders: () => of([]) } },
        { provide: VitalsApiService, useValue: { getVitals: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SuperAdminDashboardComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    component.ngOnDestroy();
    // Flush any pending HTTP requests
    httpMock.match(() => true).forEach(r => r.flush([]));
    httpMock.verify();
  });

  it('should create', () => {
    fixture.detectChanges();
    httpMock.match(() => true).forEach(r => r.flush([]));
    expect(component).toBeTruthy();
  });

  it('should return correct severity color', () => {
    expect(component.severityColor('critical')).toBe('#d63031');
    expect(component.severityColor('high')).toBe('#e17055');
    expect(component.severityColor('medium')).toBe('#fdcb6e');
    expect(component.severityColor('low')).toBe('#00b894');
  });

  it('should return correct severity icon', () => {
    expect(component.severityIcon('critical')).toBe('alert-octagon');
    expect(component.severityIcon('high')).toBe('alert-triangle');
  });

  it('should return correct audit action color', () => {
    expect(component.auditActionColor('CREATE')).toBe('#00b894');
    expect(component.auditActionColor('DELETE')).toBe('#d63031');
    expect(component.auditActionColor('LOGIN')).toBe('#6c5ce7');
  });

  it('should return correct audit action icon', () => {
    expect(component.auditActionIcon('CREATE')).toBe('circle-plus');
    expect(component.auditActionIcon('DELETE')).toBe('trash');
  });

  it('should return correct log role color', () => {
    expect(component.logRoleColor('admin')).toBe('#0984e3');
    expect(component.logRoleColor('doctor')).toBe('#00b894');
    expect(component.logRoleColor('nurse')).toBe('#00cec9');
  });

  it('should return log display name preferring userName', () => {
    const log = { userName: 'Dr. Smith', userEmail: 'smith@test.com' } as any;
    expect(component.logDisplayName(log)).toBe('Dr. Smith');
  });

  it('should fall back to email when userName is anonymous', () => {
    const log = { userName: 'anonymous', userEmail: 'user@test.com' } as any;
    expect(component.logDisplayName(log)).toBe('user@test.com');
  });
});
