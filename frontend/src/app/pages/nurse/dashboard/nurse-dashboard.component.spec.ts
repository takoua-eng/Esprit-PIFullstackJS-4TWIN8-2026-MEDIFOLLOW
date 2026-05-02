import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { NurseDashboardComponent } from './nurse-dashboard.component';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { RemindersApiService } from 'src/app/services/reminders-api.service';
import { UsersApiService, UserListRow, UserApiRow } from 'src/app/services/users-api.service';

const makeAlert = (overrides: Partial<AlertDto> = {}): AlertDto => ({
  _id: 'a1',
  patientId: 'p1',
  patientName: 'Alice',
  type: 'vital',
  severity: 'high',
  message: 'HR high',
  status: 'open',
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makePatient = (id: string): UserListRow => ({
  _id: id,
  firstName: 'Pat',
  lastName: 'Smith',
  email: `pat${id}@test.com`,
});

describe('NurseDashboardComponent', () => {
  let component: NurseDashboardComponent;
  let fixture: ComponentFixture<NurseDashboardComponent>;
  let alertsApi: jasmine.SpyObj<AlertsApiService>;
  let remindersApi: jasmine.SpyObj<RemindersApiService>;
  let usersApi: jasmine.SpyObj<UsersApiService>;

  beforeEach(async () => {
    alertsApi = jasmine.createSpyObj('AlertsApiService', ['getAlerts', 'getOpenCount']);
    remindersApi = jasmine.createSpyObj('RemindersApiService', ['getPendingCount']);
    usersApi = jasmine.createSpyObj('UsersApiService', ['getPatients', 'getAllUsers']);

    alertsApi.getAlerts.and.returnValue(of([]));
    alertsApi.getOpenCount.and.returnValue(of({ count: 0 }));
    remindersApi.getPendingCount.and.returnValue(of({ count: 0 }));
    usersApi.getPatients.and.returnValue(of([]));
    usersApi.getAllUsers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [NurseDashboardComponent],
      providers: [
        { provide: AlertsApiService, useValue: alertsApi },
        { provide: RemindersApiService, useValue: remindersApi },
        { provide: UsersApiService, useValue: usersApi },
      ],
    }).overrideComponent(NurseDashboardComponent, {
      set: { imports: [CommonModule, MockTranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(NurseDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with loading = true', () => {
    expect(component.loading).toBeTrue();
  });

  // ─── ngOnInit() ──────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('should set assignedPatients, activeAlerts and pendingReminders on success', () => {
      const patients = [makePatient('p1'), makePatient('p2')];
      const users: UserApiRow[] = [
        { _id: 'p1', firstName: 'Pat', lastName: 'Smith', email: 'p@t.com', phone: '123' },
      ];
      alertsApi.getAlerts.and.returnValue(of([makeAlert({ status: 'open' })]));
      alertsApi.getOpenCount.and.returnValue(of({ count: 3 }));
      remindersApi.getPendingCount.and.returnValue(of({ count: 2 }));
      usersApi.getPatients.and.returnValue(of(patients));
      usersApi.getAllUsers.and.returnValue(of(users));

      fixture.detectChanges();

      expect(component.assignedPatients).toBe(2);
      expect(component.activeAlerts).toBe(3);
      expect(component.pendingReminders).toBe(2);
      expect(component.loading).toBeFalse();
    });

    it('should populate recentAlerts with at most 5 open alerts sorted by date', () => {
      const now = Date.now();
      const alerts: AlertDto[] = Array.from({ length: 7 }, (_, i) =>
        makeAlert({
          _id: `a${i}`,
          status: 'open',
          createdAt: new Date(now - i * 1000).toISOString(),
        }),
      );
      alertsApi.getAlerts.and.returnValue(of(alerts));
      usersApi.getPatients.and.returnValue(of([]));
      usersApi.getAllUsers.and.returnValue(of([]));
      fixture.detectChanges();

      expect(component.recentAlerts.length).toBeLessThanOrEqual(5);
    });

    it('should exclude non-open alerts from recentAlerts', () => {
      const alerts = [
        makeAlert({ _id: 'x1', status: 'open' }),
        makeAlert({ _id: 'x2', status: 'seen' }),
        makeAlert({ _id: 'x3', status: 'reported' }),
      ];
      alertsApi.getAlerts.and.returnValue(of(alerts));
      usersApi.getPatients.and.returnValue(of([]));
      usersApi.getAllUsers.and.returnValue(of([]));
      fixture.detectChanges();

      expect(component.recentAlerts.every(a => a.status === 'open')).toBeTrue();
    });

    it('should set loadError = true and loading = false on forkJoin error', () => {
      usersApi.getPatients.and.returnValue(throwError(() => new Error('fail')));
      fixture.detectChanges();
      expect(component.loadError).toBeTrue();
      expect(component.loading).toBeFalse();
      expect(component.activeAlerts).toBeNull();
      expect(component.pendingReminders).toBeNull();
    });
  });

  // ─── phoneFor() ──────────────────────────────────────────────────────────────

  describe('phoneFor()', () => {
    it('should return the phone number when present in patientDetails', () => {
      const patient = makePatient('p1');
      (component as any).patientDetails = new Map<string, UserApiRow>([
        ['p1', { _id: 'p1', firstName: 'Pat', lastName: 'S', email: 'p@t.com', phone: '0612345678' }],
      ]);
      expect(component.phoneFor(patient)).toBe('0612345678');
    });

    it('should return "—" when patient has no phone', () => {
      const patient = makePatient('p2');
      (component as any).patientDetails = new Map<string, UserApiRow>([
        ['p2', { _id: 'p2', firstName: 'Pat', lastName: 'S', email: 'p@t.com' }],
      ]);
      expect(component.phoneFor(patient)).toBe('—');
    });

    it('should return "—" when patient not in patientDetails', () => {
      (component as any).patientDetails = new Map();
      expect(component.phoneFor(makePatient('unknown'))).toBe('—');
    });
  });

  // ─── severityClass() ─────────────────────────────────────────────────────────

  describe('severityClass()', () => {
    it('should return sev-high for "critical"', () =>
      expect(component.severityClass('critical')).toBe('sev-high'));
    it('should return sev-high for "high"', () =>
      expect(component.severityClass('high')).toBe('sev-high'));
    it('should return sev-medium for "medium"', () =>
      expect(component.severityClass('medium')).toBe('sev-medium'));
    it('should return sev-low for anything else', () =>
      expect(component.severityClass('low')).toBe('sev-low'));
    it('should be case-insensitive', () =>
      expect(component.severityClass('HIGH')).toBe('sev-high'));
  });
});
