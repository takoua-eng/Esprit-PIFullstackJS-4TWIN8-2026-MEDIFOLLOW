// ══════════════════════════════════════════════════════════════
//  reminders.spec.ts
// ══════════════════════════════════════════════════════════════
import { ComponentFixture as RemindersFixture, TestBed as RemindersBed } from '@angular/core/testing';
import { HttpClientTestingModule as RemindersHttp } from '@angular/common/http/testing';
import { NoopAnimationsModule as RemindersAnim } from '@angular/platform-browser/animations';
import { of as remindersOf } from 'rxjs';

import { Reminders } from './reminders';
import { CoordinatorService as RemindersCoordService } from 'src/app/services/coordinator.service';
import { CoreService as RemindersCoreService } from 'src/app/services/core.service';

const mockRemindersList = [
  {
    _id: 'r1',
    patientId: { _id: 'p1', firstName: 'Karim', lastName: 'Sassi', email: 'k@test.com' },
    type: 'follow_up', message: 'Please complete your daily follow-up.',
    status: 'sent', scheduledAt: new Date().toISOString(), sentAt: new Date().toISOString(),
  },
  {
    _id: 'r2',
    patientId: { _id: 'p2', firstName: 'Nada', lastName: 'Ben Ali', email: 'n@test.com' },
    type: 'follow_up', message: 'Urgent: please submit your vitals.',
    status: 'scheduled', scheduledAt: new Date().toISOString(), sentAt: null,
  },
];

const mockRemindersCoordService = {
  getReminders: jest.fn().mockReturnValue(remindersOf(mockRemindersList)),
  getAssignedPatients: jest.fn().mockReturnValue(remindersOf([])),
  createReminder: jest.fn().mockReturnValue(remindersOf({ _id: 'r3', status: 'scheduled' })),
  sendReminder: jest.fn().mockReturnValue(remindersOf({ _id: 'r3', status: 'sent' })),
  cancelReminder: jest.fn().mockReturnValue(remindersOf({ _id: 'r2', status: 'cancelled' })),
  deleteReminder: jest.fn().mockReturnValue(remindersOf({ message: 'Reminder deleted' })),
  updateReminder: jest.fn().mockReturnValue(remindersOf({ _id: 'r1', type: 'urgent' })),
  getPersonalizedMessage: jest.fn().mockReturnValue(remindersOf({
    message: 'Dear Karim, please complete your follow-up.',
    missingVitals: [],
    missingSymptoms: ['Pain Level'],
  })),
};

const mockRemindersCoreService = {
  currentUser: jest.fn().mockReturnValue({ _id: 'coord123' }),
};

describe('Reminders', () => {
  let component: Reminders;
  let fixture: RemindersFixture<Reminders>;

  beforeEach(async () => {
    await RemindersBed.configureTestingModule({
      imports: [Reminders, RemindersHttp, RemindersAnim],
      providers: [
        { provide: RemindersCoordService, useValue: mockRemindersCoordService },
        { provide: RemindersCoreService, useValue: mockRemindersCoreService },
      ],
    }).compileComponents();

    fixture = RemindersBed.createComponent(Reminders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load reminders on init', () => {
    expect(mockRemindersCoordService.getReminders).toHaveBeenCalled();
  });

  it('should have 2 reminders after loading', () => {
    expect(component.reminders).toHaveLength(2);
  });

  it('should correctly count sent reminders', () => {
    const sent = component.reminders.filter((r: any) => r.status === 'sent');
    expect(sent).toHaveLength(1);
  });

  it('should correctly count scheduled reminders', () => {
    const scheduled = component.reminders.filter((r: any) => r.status === 'scheduled');
    expect(scheduled).toHaveLength(1);
  });
});
