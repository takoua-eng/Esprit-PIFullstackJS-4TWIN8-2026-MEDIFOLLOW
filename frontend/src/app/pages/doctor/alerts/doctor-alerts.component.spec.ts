import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { DoctorAlertsComponent } from './doctor-alerts.component';

@Pipe({ name: 'translate', standalone: true })
class MockTranslatePipe implements PipeTransform {
  transform(value: string): string { return value; }
}
import {
  AlertsApiService,
  AlertDto,
  ClinicalReviewQueueItemDto,
} from 'src/app/services/alerts-api.service';
import { UsersApiService } from 'src/app/services/users-api.service';
import { VideoCallsApiService } from 'src/app/services/video-calls-api.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

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

const makeQueueItem = (overrides: Partial<ClinicalReviewQueueItemDto> = {}): ClinicalReviewQueueItemDto => ({
  queueId: 'q1',
  sourceType: 'vital',
  sourceId: 's1',
  patientId: 'p1',
  patientName: 'Alice',
  summary: 'HR elevated',
  parameter: 'heartRate',
  value: 120,
  threshold: 100,
  recordedAt: new Date().toISOString(),
  heuristicSeverity: 'high',
  severityCategory: 'urgent',
  sortScore: 1,
  ...overrides,
});

describe('DoctorAlertsComponent', () => {
  let component: DoctorAlertsComponent;
  let fixture: ComponentFixture<DoctorAlertsComponent>;
  let alertsApi: jasmine.SpyObj<AlertsApiService>;
  let usersApi: jasmine.SpyObj<UsersApiService>;

  beforeEach(async () => {
    alertsApi = jasmine.createSpyObj('AlertsApiService', [
      'getAlerts', 'getClinicalReviewQueue', 'getOpenCount', 'createUrgentClinicAlert',
    ]);
    usersApi = jasmine.createSpyObj('UsersApiService', ['getPhysicians']);
    const videoCallsApi = jasmine.createSpyObj('VideoCallsApiService', ['invite']);
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    const translate = jasmine.createSpyObj('TranslateService', ['instant']);

    alertsApi.getAlerts.and.returnValue(of([]));
    alertsApi.getClinicalReviewQueue.and.returnValue(of({ items: [], sortedBy: 'heuristic' as const }));
    usersApi.getPhysicians.and.returnValue(of([]));
    translate.instant.and.callFake((key: string) => key);

    await TestBed.configureTestingModule({
      imports: [DoctorAlertsComponent],
      providers: [
        { provide: AlertsApiService, useValue: alertsApi },
        { provide: UsersApiService, useValue: usersApi },
        { provide: VideoCallsApiService, useValue: videoCallsApi },
        { provide: MatDialog, useValue: dialog },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: TranslateService, useValue: translate },
      ],
    }).overrideComponent(DoctorAlertsComponent, {
      set: { imports: [CommonModule, MockTranslatePipe], schemas: [NO_ERRORS_SCHEMA] },
    }).compileComponents();

    fixture = TestBed.createComponent(DoctorAlertsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── filteredAlerts getter ───────────────────────────────────────────────────

  describe('filteredAlerts', () => {
    beforeEach(() => {
      component.alerts = [
        makeAlert({ _id: '1', status: 'open', severity: 'high', type: 'vital', patientName: 'Alice' }),
        makeAlert({ _id: '2', status: 'seen', severity: 'medium', type: 'symptom', patientName: 'Bob' }),
        makeAlert({ _id: '3', status: 'open', severity: 'low', type: 'vital', patientName: 'Carol' }),
      ];
    });

    it('should return only open alerts when filter is "open"', () => {
      component.filter = 'open';
      expect(component.filteredAlerts).toHaveSize(2);
    });

    it('should return all alerts when filter is "all"', () => {
      component.filter = 'all';
      expect(component.filteredAlerts).toHaveSize(3);
    });

    it('should filter by severity', () => {
      component.filter = 'all';
      component.severityFilter = 'high';
      expect(component.filteredAlerts).toHaveSize(1);
      expect(component.filteredAlerts[0]._id).toBe('1');
    });

    it('should filter by type', () => {
      component.filter = 'all';
      component.typeFilter = 'symptom';
      expect(component.filteredAlerts).toHaveSize(1);
      expect(component.filteredAlerts[0]._id).toBe('2');
    });

    it('should filter by search text on patientName', () => {
      component.filter = 'all';
      component.searchText = 'alice';
      expect(component.filteredAlerts).toHaveSize(1);
      expect(component.filteredAlerts[0]._id).toBe('1');
    });

    it('should filter by search text on message', () => {
      component.filter = 'all';
      component.alerts[0].message = 'Tachycardia detected';
      component.searchText = 'tachy';
      expect(component.filteredAlerts).toHaveSize(1);
    });
  });

  // ─── filteredQueue getter ────────────────────────────────────────────────────

  describe('filteredQueue', () => {
    beforeEach(() => {
      component.reviewQueue = [
        makeQueueItem({ queueId: 'q1', sourceType: 'vital', severityCategory: 'urgent', patientName: 'Alice' }),
        makeQueueItem({ queueId: 'q2', sourceType: 'symptom', severityCategory: 'warning', patientName: 'Bob' }),
        makeQueueItem({ queueId: 'q3', sourceType: 'vital', severityCategory: 'info', patientName: 'Carol' }),
      ];
    });

    it('should return all items with default filters', () => {
      expect(component.filteredQueue).toHaveSize(3);
    });

    it('should filter by sourceType', () => {
      component.queueTypeFilter = 'symptom';
      expect(component.filteredQueue).toHaveSize(1);
      expect(component.filteredQueue[0].queueId).toBe('q2');
    });

    it('should filter by urgency category', () => {
      component.queueUrgencyFilter = 'urgent';
      expect(component.filteredQueue).toHaveSize(1);
      expect(component.filteredQueue[0].queueId).toBe('q1');
    });

    it('should filter by search text on patientName', () => {
      component.queueSearchText = 'carol';
      expect(component.filteredQueue).toHaveSize(1);
      expect(component.filteredQueue[0].queueId).toBe('q3');
    });
  });

  // ─── paginatedAlerts / paginatedQueue ────────────────────────────────────────

  describe('paginatedAlerts', () => {
    it('should return first page slice', () => {
      component.alerts = Array.from({ length: 15 }, (_, i) =>
        makeAlert({ _id: `a${i}`, status: 'open' }));
      component.filter = 'open';
      component.pageSize = 10;
      component.pageIndex = 0;
      expect(component.paginatedAlerts).toHaveSize(10);
    });

    it('should return second page slice', () => {
      component.alerts = Array.from({ length: 15 }, (_, i) =>
        makeAlert({ _id: `a${i}`, status: 'open' }));
      component.filter = 'open';
      component.pageSize = 10;
      component.pageIndex = 1;
      expect(component.paginatedAlerts).toHaveSize(5);
    });
  });

  describe('paginatedQueue', () => {
    it('should return first page of queue', () => {
      component.reviewQueue = Array.from({ length: 12 }, (_, i) =>
        makeQueueItem({ queueId: `q${i}` }));
      component.queuePageSize = 10;
      component.queuePageIndex = 0;
      expect(component.paginatedQueue).toHaveSize(10);
    });
  });

  // ─── totalFilteredCount / totalQueueCount ────────────────────────────────────

  describe('totalFilteredCount', () => {
    it('should equal filteredAlerts length', () => {
      component.alerts = [makeAlert(), makeAlert({ _id: 'a2' })];
      component.filter = 'all';
      expect(component.totalFilteredCount).toBe(2);
    });
  });

  describe('totalQueueCount', () => {
    it('should equal filteredQueue length', () => {
      component.reviewQueue = [makeQueueItem(), makeQueueItem({ queueId: 'q2' })];
      expect(component.totalQueueCount).toBe(2);
    });
  });

  // ─── clearFilters() / clearQueueFilters() ────────────────────────────────────

  describe('clearFilters()', () => {
    it('should reset all alert filters', () => {
      component.filter = 'all';
      component.severityFilter = 'high';
      component.typeFilter = 'vital';
      component.searchText = 'alice';
      component.pageIndex = 3;
      component.clearFilters();
      expect(component.filter).toBe('open');
      expect(component.severityFilter).toBe('all');
      expect(component.typeFilter).toBe('all');
      expect(component.searchText).toBe('');
      expect(component.pageIndex).toBe(0);
    });
  });

  describe('clearQueueFilters()', () => {
    it('should reset all queue filters', () => {
      component.queueTypeFilter = 'vital';
      component.queueUrgencyFilter = 'urgent';
      component.queueSearchText = 'bob';
      component.queuePageIndex = 2;
      component.clearQueueFilters();
      expect(component.queueTypeFilter).toBe('all');
      expect(component.queueUrgencyFilter).toBe('all');
      expect(component.queueSearchText).toBe('');
      expect(component.queuePageIndex).toBe(0);
    });
  });

  // ─── hasActiveFilters / hasActiveQueueFilters ─────────────────────────────────

  describe('hasActiveFilters', () => {
    it('should be false when all filters are default', () => {
      component.filter = 'open';
      component.severityFilter = 'all';
      component.typeFilter = 'all';
      component.searchText = '';
      expect(component.hasActiveFilters).toBeFalse();
    });

    it('should be true when severityFilter is set', () => {
      component.severityFilter = 'high';
      expect(component.hasActiveFilters).toBeTrue();
    });
  });

  describe('hasActiveQueueFilters', () => {
    it('should be false by default', () => {
      expect(component.hasActiveQueueFilters).toBeFalse();
    });

    it('should be true when queueSearchText is non-empty', () => {
      component.queueSearchText = 'x';
      expect(component.hasActiveQueueFilters).toBeTrue();
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
    it('should return sev-low for "low"', () =>
      expect(component.severityClass('low')).toBe('sev-low'));
  });

  // ─── issuedStatusLabel() / issuedStatusClass() ───────────────────────────────

  describe('issuedStatusLabel()', () => {
    it('should return "Seen" for "seen"', () =>
      expect(component.issuedStatusLabel('seen')).toBe('Seen'));
    it('should return "Reported" for "reported"', () =>
      expect(component.issuedStatusLabel('reported')).toBe('Reported'));
    it('should return "Confirmed" for "acknowledged"', () =>
      expect(component.issuedStatusLabel('acknowledged')).toBe('Confirmed'));
    it('should return "Pending" for unknown', () =>
      expect(component.issuedStatusLabel('open')).toBe('Pending'));
  });

  describe('issuedStatusClass()', () => {
    it('should return status-seen', () =>
      expect(component.issuedStatusClass('seen')).toBe('status-seen'));
    it('should return status-reported', () =>
      expect(component.issuedStatusClass('reported')).toBe('status-reported'));
    it('should return status-done for acknowledged', () =>
      expect(component.issuedStatusClass('acknowledged')).toBe('status-done'));
    it('should return status-open for unknown', () =>
      expect(component.issuedStatusClass('open')).toBe('status-open'));
  });

  // ─── queueSeverityClass() ────────────────────────────────────────────────────

  describe('queueSeverityClass()', () => {
    it('should return sev-high for urgent', () =>
      expect(component.queueSeverityClass(makeQueueItem({ severityCategory: 'urgent' }))).toBe('sev-high'));
    it('should return sev-medium for warning', () =>
      expect(component.queueSeverityClass(makeQueueItem({ severityCategory: 'warning' }))).toBe('sev-medium'));
    it('should return sev-low for info', () =>
      expect(component.queueSeverityClass(makeQueueItem({ severityCategory: 'info' }))).toBe('sev-low'));
  });

  // ─── onFilterChange() / onPageChange() ──────────────────────────────────────

  describe('onFilterChange()', () => {
    it('should reset pageIndex to 0', () => {
      component.pageIndex = 5;
      component.onFilterChange();
      expect(component.pageIndex).toBe(0);
    });
  });

  describe('onPageChange()', () => {
    it('should update pageIndex and pageSize', () => {
      component.onPageChange({ pageIndex: 2, pageSize: 25 });
      expect(component.pageIndex).toBe(2);
      expect(component.pageSize).toBe(25);
    });
  });

  describe('onQueueFilterChange()', () => {
    it('should reset queuePageIndex to 0', () => {
      component.queuePageIndex = 3;
      component.onQueueFilterChange();
      expect(component.queuePageIndex).toBe(0);
    });
  });

  describe('onQueuePageChange()', () => {
    it('should update queuePageIndex and queuePageSize', () => {
      component.onQueuePageChange({ pageIndex: 1, pageSize: 5 });
      expect(component.queuePageIndex).toBe(1);
      expect(component.queuePageSize).toBe(5);
    });
  });

  // ─── load() with no token ────────────────────────────────────────────────────

  describe('load()', () => {
    it('should set noDoctorSession = true when no physician found', () => {
      localStorage.removeItem('accessToken');
      usersApi.getPhysicians.and.returnValue(of([]));
      component.load();
      expect(component.noDoctorSession).toBeTrue();
    });

    it('should set error when getPhysicians fails', () => {
      localStorage.removeItem('accessToken');
      usersApi.getPhysicians.and.returnValue(throwError(() => ({ status: 503 })));
      component.load();
      expect(component.error).toBe('HTTP 503');
    });
  });
});
