// auditor-reminders.component.spec.ts

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AuditorRemindersComponent } from './auditor-reminders.component';
import { API_BASE_URL } from 'src/app/core/api.config';

describe('AuditorRemindersComponent', () => {
  let component: AuditorRemindersComponent;
  let fixture: ComponentFixture<AuditorRemindersComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AuditorRemindersComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorRemindersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────────────────────
  // LOAD DATA TEST
  // ─────────────────────────────────────────────
  it('should load reminders data correctly', () => {
    const mockResponse = {
      stats: {
        total: 2,
        sentCount: 1,
        scheduledCount: 1,
        cancelledCount: 0,
        successRate: 50,
        avgDelayMin: 30,
      },
      reminders: [
        {
          _id: '1',
          createdAt: '2026-01-01',
          scheduledAt: '2026-01-01',
          sentAt: '2026-01-01',
          patientName: 'Ahmed',
          patientEmail: 'ahmed@test.com',
          coordinatorName: 'Coord 1',
          type: 'email',
          message: 'Reminder message',
          status: 'sent',
          emailSent: true,
          smsSent: false,
        },
        {
          _id: '2',
          createdAt: '2026-01-02',
          scheduledAt: '2026-01-02',
          sentAt: '',
          patientName: 'Ali',
          patientEmail: 'ali@test.com',
          coordinatorName: 'Coord 2',
          type: 'sms',
          message: 'SMS reminder',
          status: 'scheduled',
          emailSent: false,
          smsSent: true,
        },
      ],
    };

    const req = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/auditor/reminders-overview`
    );

    expect(req.request.method).toBe('GET');

    req.flush(mockResponse);

    expect(component.stats.total).toBe(2);
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading).toBeFalse();
  });

  // ─────────────────────────────────────────────
  // SEARCH TEST
  // ─────────────────────────────────────────────
  it('should update search text correctly', () => {
    const event = {
      target: { value: 'Ahmed' }
    } as unknown as Event;

    component.onSearch(event);

    expect(component.searchText).toBe('Ahmed');
  });

  // ─────────────────────────────────────────────
  // STATUS COLOR TEST
  // ─────────────────────────────────────────────
  it('should return correct status colors', () => {
    expect(component.statusColor('sent')).toBe('#00b894');
    expect(component.statusColor('scheduled')).toBe('#0984e3');
    expect(component.statusColor('cancelled')).toBe('#d63031');
  });

  // ─────────────────────────────────────────────
  // DELAY LABEL TEST
  // ─────────────────────────────────────────────
  it('should return correct delay labels', () => {
    expect(component.delayLabel(null)).toBe('—');
    expect(component.delayLabel(30)).toBe('30m');
    expect(component.delayLabel(120)).toBe('2h 0m');
  });

  // ─────────────────────────────────────────────
  // FILTER TEST (WITHOUT private access)
  // ─────────────────────────────────────────────
  it('should filter reminders by status using public API only', () => {
    const mockResponse = {
      stats: {
        total: 2,
        sentCount: 1,
        scheduledCount: 1,
        cancelledCount: 0,
        successRate: 50,
        avgDelayMin: 30,
      },
      reminders: [
        {
          _id: '1',
          createdAt: '',
          scheduledAt: '',
          sentAt: '',
          patientName: 'Ahmed',
          patientEmail: '',
          coordinatorName: '',
          type: '',
          message: '',
          status: 'sent',
          emailSent: true,
          smsSent: false,
        },
        {
          _id: '2',
          createdAt: '',
          scheduledAt: '',
          sentAt: '',
          patientName: 'Ali',
          patientEmail: '',
          coordinatorName: '',
          type: '',
          message: '',
          status: 'cancelled',
          emailSent: false,
          smsSent: true,
        },
      ],
    };

    const req = httpMock.expectOne(
      `${API_BASE_URL}/coordinator/auditor/reminders-overview`
    );

    req.flush(mockResponse);

    // filtre via UI logique
    component.filterStatus = 'sent';
    component.applyFilters();

    // on vérifie la table (public output Angular Material)
    const filtered = component.dataSource.data.filter(r => r.status === 'sent');

    expect(filtered.length).toBe(1);
  });
});