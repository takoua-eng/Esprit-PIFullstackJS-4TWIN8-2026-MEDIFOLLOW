// ══════════════════════════════════════════════════════════════
//  reminders.spec.ts
// ══════════════════════════════════════════════════════════════
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';

import { RemindersComponent } from './reminders';
import { CoordinatorService } from 'src/app/services/coordinator.service';
import { CoreService } from 'src/app/services/core.service';

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

const mockCoordinatorService = {
  getReminders:           jasmine.createSpy('getReminders').and.returnValue(of(mockRemindersList)),
  getAssignedPatients:    jasmine.createSpy('getAssignedPatients').and.returnValue(of([])),
  getComplianceToday:     jasmine.createSpy('getComplianceToday').and.returnValue(of([])),
  createReminder:         jasmine.createSpy('createReminder').and.returnValue(of({ _id: 'r3', status: 'scheduled' })),
  sendReminder:           jasmine.createSpy('sendReminder').and.returnValue(of({ _id: 'r3', status: 'sent' })),
  cancelReminder:         jasmine.createSpy('cancelReminder').and.returnValue(of({ _id: 'r2', status: 'cancelled' })),
  deleteReminder:         jasmine.createSpy('deleteReminder').and.returnValue(of({ message: 'Reminder deleted' })),
  updateReminder:         jasmine.createSpy('updateReminder').and.returnValue(of({ _id: 'r1', type: 'urgent' })),
  getPersonalizedMessage: jasmine.createSpy('getPersonalizedMessage').and.returnValue(of({
    message: 'Dear Karim, please complete your follow-up.',
    missingVitals: [],
    missingSymptoms: ['Pain Level'],
  })),
};

const mockCoreService = {
  currentUser: jasmine.createSpy('currentUser').and.returnValue({ _id: 'coord123' }),
};

describe('RemindersComponent', () => {
  let component: RemindersComponent;
  let fixture: ComponentFixture<RemindersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemindersComponent, HttpClientTestingModule, NoopAnimationsModule, TablerIconsModule.pick({}), TranslateModule.forRoot()],
      providers: [
        { provide: CoordinatorService, useValue: mockCoordinatorService },
        { provide: CoreService, useValue: mockCoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RemindersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockCoordinatorService.getReminders.calls.reset();
    mockCoordinatorService.getAssignedPatients.calls.reset();
    mockCoordinatorService.getComplianceToday.calls.reset();
    mockCoreService.currentUser.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load reminders on init', () => {
    expect(mockCoordinatorService.getReminders).toHaveBeenCalled();
  });

  it('should have 2 reminders after loading', () => {
    expect(component.reminders.length).toBe(2);
  });

  it('should correctly count sent reminders', () => {
    const sent = component.reminders.filter((r: any) => r.status === 'sent');
    expect(sent.length).toBe(1);
  });

  it('should correctly count scheduled reminders', () => {
    const scheduled = component.reminders.filter((r: any) => r.status === 'scheduled');
    expect(scheduled.length).toBe(1);
  });
});
