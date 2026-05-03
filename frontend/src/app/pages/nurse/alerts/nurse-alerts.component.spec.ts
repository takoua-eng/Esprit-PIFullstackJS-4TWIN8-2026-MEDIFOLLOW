import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { NurseAlertsComponent } from './nurse-alerts.component';
import { AlertsApiService, AlertDto } from 'src/app/services/alerts-api.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}

const makeAlert = (overrides: Partial<AlertDto> = {}): AlertDto => ({
  _id: 'a1',
  patientId: 'p1',
  patientName: 'Alice',
  type: 'vital',
  severity: 'high',
  message: 'HR too high',
  status: 'open',
  ...overrides,
});

describe('NurseAlertsComponent', () => {
  let component: NurseAlertsComponent;
  let fixture: ComponentFixture<NurseAlertsComponent>;
  let alertsApi: jasmine.SpyObj<AlertsApiService>;
  let usersApi: jasmine.SpyObj<UsersApiService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(async () => {
    alertsApi = jasmine.createSpyObj('AlertsApiService', [
      'getAlerts', 'markAsSeen', 'markAsReported',
    ]);
    usersApi = jasmine.createSpyObj('UsersApiService', ['getPatients']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

    alertsApi.getAlerts.and.returnValue(of([]));
    usersApi.getPatients.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [NurseAlertsComponent],
      providers: [
        { provide: AlertsApiService, useValue: alertsApi },
        { provide: UsersApiService, useValue: usersApi },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    }).overrideComponent(NurseAlertsComponent, {
      set: { imports: [CommonModule, MockTranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(NurseAlertsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── ngOnInit ────────────────────────────────────────────────────────────────

  describe('ngOnInit()', () => {
    it('should load patients and alerts on init', () => {
      const patients = [{ _id: 'p1', firstName: 'Alice', lastName: 'A', email: 'a@a.com' }];
      usersApi.getPatients.and.returnValue(of(patients));
      alertsApi.getAlerts.and.returnValue(of([makeAlert()]));
      fixture.detectChanges();
      expect(usersApi.getPatients).toHaveBeenCalled();
      expect(alertsApi.getAlerts).toHaveBeenCalled();
      expect(component.patients).toEqual(patients);
      expect(component.alerts).toHaveSize(1);
      expect(component.loading).toBeFalse();
    });

    it('should set error when getAlerts fails', () => {
      alertsApi.getAlerts.and.returnValue(throwError(() => ({ status: 500 })));
      fixture.detectChanges();
      expect(component.error).toBe('HTTP 500');
      expect(component.loading).toBeFalse();
    });
  });

  // ─── filteredAlerts ──────────────────────────────────────────────────────────

  describe('filteredAlerts getter', () => {
    beforeEach(() => {
      component.alerts = [
        makeAlert({ _id: 'a1', status: 'open' }),
        makeAlert({ _id: 'a2', status: 'seen' }),
        makeAlert({ _id: 'a3', status: 'reported' }),
      ];
    });

    it('should return all alerts when filter is "all"', () => {
      component.filter = 'all';
      expect(component.filteredAlerts).toHaveSize(3);
    });

    it('should return only open alerts when filter is "open"', () => {
      component.filter = 'open';
      expect(component.filteredAlerts).toHaveSize(1);
      expect(component.filteredAlerts[0]._id).toBe('a1');
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
    it('should return sev-medium for "warning"', () =>
      expect(component.severityClass('warning')).toBe('sev-medium'));
    it('should return sev-low for "low"', () =>
      expect(component.severityClass('low')).toBe('sev-low'));
    it('should return sev-low for empty string', () =>
      expect(component.severityClass('')).toBe('sev-low'));
  });

  // ─── statusLabel() ───────────────────────────────────────────────────────────

  describe('statusLabel()', () => {
    it('should return "Seen" for "seen"', () =>
      expect(component.statusLabel('seen')).toBe('Seen'));
    it('should return "Reported" for "reported"', () =>
      expect(component.statusLabel('reported')).toBe('Reported'));
    it('should return "Acknowledged" for "acknowledged"', () =>
      expect(component.statusLabel('acknowledged')).toBe('Acknowledged'));
    it('should return "Open" for "open"', () =>
      expect(component.statusLabel('open')).toBe('Open'));
    it('should return "Open" for unknown status', () =>
      expect(component.statusLabel('unknown')).toBe('Open'));
  });

  // ─── statusClass() ───────────────────────────────────────────────────────────

  describe('statusClass()', () => {
    it('should return status-seen for "seen"', () =>
      expect(component.statusClass('seen')).toBe('status-seen'));
    it('should return status-reported for "reported"', () =>
      expect(component.statusClass('reported')).toBe('status-reported'));
    it('should return status-done for "acknowledged"', () =>
      expect(component.statusClass('acknowledged')).toBe('status-done'));
    it('should return status-open for "open"', () =>
      expect(component.statusClass('open')).toBe('status-open'));
  });

  // ─── isActionable() ──────────────────────────────────────────────────────────

  describe('isActionable()', () => {
    it('should return true for open alert', () =>
      expect(component.isActionable(makeAlert({ status: 'open' }))).toBeTrue());
    it('should return false for seen alert', () =>
      expect(component.isActionable(makeAlert({ status: 'seen' }))).toBeFalse());
    it('should return false for reported alert', () =>
      expect(component.isActionable(makeAlert({ status: 'reported' }))).toBeFalse());
  });

  // ─── markAsSeen() ────────────────────────────────────────────────────────────

  describe('markAsSeen()', () => {
    it('should call alertsApi.markAsSeen and update local alert', () => {
      const alert = makeAlert({ _id: 'x1', status: 'open' });
      const updated = makeAlert({ _id: 'x1', status: 'seen' });
      component.alerts = [alert];
      alertsApi.markAsSeen.and.returnValue(of(updated));
      component.markAsSeen(alert);
      expect(alertsApi.markAsSeen).toHaveBeenCalledWith('x1', undefined);
      expect(component.alerts[0].status).toBe('seen');
      expect(snackBar.open).toHaveBeenCalled();
    });

    it('should not call API a second time when alert is already actioning', () => {
      const alert = makeAlert({ _id: 'x2', status: 'open' });
      alertsApi.markAsSeen.and.returnValue(of(makeAlert({ _id: 'x2', status: 'seen' })));
      component.actioning.add('x2');
      component.markAsSeen(alert);
      expect(alertsApi.markAsSeen).not.toHaveBeenCalled();
    });

    it('should show snackbar error when API fails', () => {
      const alert = makeAlert({ _id: 'x3', status: 'open' });
      component.alerts = [alert];
      alertsApi.markAsSeen.and.returnValue(throwError(() => new Error('fail')));
      component.markAsSeen(alert);
      expect(snackBar.open).toHaveBeenCalledWith('Failed to update alert', undefined, jasmine.any(Object));
    });
  });

  // ─── markAsReported() ────────────────────────────────────────────────────────

  describe('markAsReported()', () => {
    it('should call alertsApi.markAsReported and update local alert', () => {
      const alert = makeAlert({ _id: 'y1', status: 'open' });
      const updated = makeAlert({ _id: 'y1', status: 'reported' });
      component.alerts = [alert];
      alertsApi.markAsReported.and.returnValue(of(updated));
      component.markAsReported(alert);
      expect(alertsApi.markAsReported).toHaveBeenCalledWith('y1', undefined);
      expect(component.alerts[0].status).toBe('reported');
    });

    it('should not call API when alert is already actioning', () => {
      const alert = makeAlert({ _id: 'y2', status: 'open' });
      component.actioning.add('y2');
      component.markAsReported(alert);
      expect(alertsApi.markAsReported).not.toHaveBeenCalled();
    });
  });

  // ─── load() ──────────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('should set loading=false after successful fetch', () => {
      alertsApi.getAlerts.and.returnValue(of([makeAlert()]));
      component.load();
      expect(component.loading).toBeFalse();
      expect(component.alerts).toHaveSize(1);
    });

    it('should set error when fetch fails', () => {
      alertsApi.getAlerts.and.returnValue(throwError(() => ({ status: 503 })));
      component.load();
      expect(component.error).toBe('HTTP 503');
      expect(component.loading).toBeFalse();
    });
  });
});
