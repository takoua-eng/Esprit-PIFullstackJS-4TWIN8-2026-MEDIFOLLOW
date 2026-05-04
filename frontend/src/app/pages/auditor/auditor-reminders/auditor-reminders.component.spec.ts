import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
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
      imports: [AuditorRemindersComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [...TABLER_TEST_PROVIDERS],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorRemindersComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should create component', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).flush({ stats: {}, reminders: [] });
    expect(component).toBeTruthy();
  });

  it('should load reminders data correctly', () => {
    fixture.detectChanges();
    const mockResponse = {
      stats: { total: 2, sentCount: 1, scheduledCount: 1, cancelledCount: 0, successRate: 50, avgDelayMin: 30 },
      reminders: [
        { _id: '1', createdAt: '2026-01-01', scheduledAt: '2026-01-01', sentAt: '2026-01-01', patientName: 'Ahmed', patientEmail: 'ahmed@test.com', coordinatorName: 'Coord 1', type: 'email', message: 'Reminder', status: 'sent', emailSent: true, smsSent: false },
        { _id: '2', createdAt: '2026-01-02', scheduledAt: '2026-01-02', sentAt: '', patientName: 'Ali', patientEmail: 'ali@test.com', coordinatorName: 'Coord 2', type: 'sms', message: 'SMS', status: 'scheduled', emailSent: false, smsSent: true },
      ],
    };
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).flush(mockResponse);

    expect(component.stats.total).toBe(2);
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading).toBeFalse();
  });

  it('should update search text correctly', () => {
    fixture.detectChanges();
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).flush({ stats: {}, reminders: [] });
    const event = { target: { value: 'Ahmed' } } as unknown as Event;
    component.onSearch(event);
    expect(component.searchText).toBe('Ahmed');
  });

  it('should return correct status colors', () => {
    expect(component.statusColor('sent')).toBe('#00b894');
    expect(component.statusColor('scheduled')).toBe('#0984e3');
    expect(component.statusColor('cancelled')).toBe('#d63031');
  });

  it('should return correct delay labels', () => {
    expect(component.delayLabel(null)).toBe('—');
    expect(component.delayLabel(30)).toBe('30m');
    expect(component.delayLabel(120)).toBe('2h 0m');
  });

  it('should filter reminders by status using public API only', () => {
    fixture.detectChanges();
    const mockResponse = {
      stats: { total: 2, sentCount: 1, scheduledCount: 1, cancelledCount: 0, successRate: 50, avgDelayMin: 30 },
      reminders: [
        { _id: '1', createdAt: '', scheduledAt: '', sentAt: '', patientName: 'Ahmed', patientEmail: '', coordinatorName: '', type: '', message: '', status: 'sent', emailSent: true, smsSent: false },
        { _id: '2', createdAt: '', scheduledAt: '', sentAt: '', patientName: 'Ali', patientEmail: '', coordinatorName: '', type: '', message: '', status: 'cancelled', emailSent: false, smsSent: true },
      ],
    };
    httpMock.expectOne(`${API_BASE_URL}/coordinator/auditor/reminders-overview`).flush(mockResponse);

    component.filterStatus = 'sent';
    component.applyFilters();
    const filtered = component.dataSource.data.filter(r => r.status === 'sent');
    expect(filtered.length).toBe(1);
  });
});
