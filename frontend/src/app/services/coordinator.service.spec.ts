import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CoordinatorService, buildReminderMessages } from './coordinator.service';

describe('CoordinatorService', () => {
  let service: CoordinatorService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/coordinator';
  const coordId = 'coord123';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CoordinatorService],
    });
    service = TestBed.inject(CoordinatorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getDashboard', () => {
    it('should GET dashboard for coordinator', () => {
      const mockResponse = { summary: { totalAssignedPatients: 5 }, departmentDistribution: [], recentPatients: [] };

      service.getDashboard(coordId).subscribe((res) => {
        expect(res.summary.totalAssignedPatients).toBe(5);
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/dashboard`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getAssignedPatients', () => {
    it('should GET assigned patients list', () => {
      const mockPatients = [
        { _id: 'p1', name: 'Karim Sassi', email: 'k@test.com', department: 'Cardiology', status: 'Complete' },
      ];

      service.getAssignedPatients(coordId).subscribe((res) => {
        expect(res.length).toBe(1); // ✔ corrigé : toHaveLength → .length).toBe()
        expect(res[0].name).toBe('Karim Sassi');
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/patients`);
      expect(req.request.method).toBe('GET');
      req.flush(mockPatients);
    });
  });

  describe('getComplianceToday', () => {
    it('should GET compliance data for today', () => {
      const mockCompliance = [
        { _id: 'p1', name: 'Nada Ben Ali', isFullyCompliant: false, vitalsSubmitted: false, symptomsSubmitted: true },
      ];

      service.getComplianceToday(coordId).subscribe((res) => {
        expect(res[0].isFullyCompliant).toBeFalse();
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/compliance/today`);
      expect(req.request.method).toBe('GET');
      req.flush(mockCompliance);
    });
  });

  describe('getReminders', () => {
    it('should GET reminders for coordinator', () => {
      const mockReminders = [
        { _id: 'r1', type: 'follow_up', message: 'Please complete.', status: 'sent' },
        { _id: 'r2', type: 'follow_up', message: 'Urgent.', status: 'scheduled' },
      ];

      service.getReminders(coordId).subscribe((res) => {
        expect(res.length).toBe(2); // ✔ corrigé : toHaveLength → .length).toBe()
        expect(res[0].status).toBe('sent');
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/reminders`);
      expect(req.request.method).toBe('GET');
      req.flush(mockReminders);
    });
  });

  describe('createReminder', () => {
    it('should POST a new reminder', () => {
      const body = { patientId: 'p1', type: 'follow_up', message: 'Please submit your data.' };
      const mockCreated = { _id: 'r1', ...body, status: 'scheduled' };

      service.createReminder(coordId, body).subscribe((res: any) => {
        expect(res._id).toBe('r1');
        expect(res.status).toBe('scheduled');
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/reminders`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(mockCreated);
    });
  });

  describe('sendReminder', () => {
    it('should PUT to send reminder', () => {
      const mockSent = { _id: 'r1', status: 'sent', emailSent: true };

      service.sendReminder('r1').subscribe((res: any) => {
        expect(res.status).toBe('sent');
        expect(res.emailSent).toBeTrue();
      });

      const req = httpMock.expectOne(`${apiUrl}/reminders/r1/send`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockSent);
    });
  });

  describe('cancelReminder', () => {
    it('should PUT to cancel reminder', () => {
      const mockCancelled = { _id: 'r1', status: 'cancelled' };

      service.cancelReminder('r1').subscribe((res: any) => {
        expect(res.status).toBe('cancelled');
      });

      const req = httpMock.expectOne(`${apiUrl}/reminders/r1/cancel`);
      expect(req.request.method).toBe('PUT');
      req.flush(mockCancelled);
    });
  });

  describe('deleteReminder', () => {
    it('should DELETE a reminder', () => {
      service.deleteReminder('r1').subscribe((res: any) => {
        expect(res.message).toBe('Reminder deleted');
      });

      const req = httpMock.expectOne(`${apiUrl}/reminders/r1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Reminder deleted' });
    });
  });

  describe('updateReminder', () => {
    it('should PUT updated reminder fields', () => {
      const body = { type: 'urgent', message: 'Updated message' };
      const mockUpdated = { _id: 'r1', ...body };

      service.updateReminder('r1', body).subscribe((res: any) => {
        expect(res.type).toBe('urgent');
      });

      const req = httpMock.expectOne(`${apiUrl}/reminders/r1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush(mockUpdated);
    });
  });

  describe('getPersonalizedMessage', () => {
    it('should GET personalized message for patient', () => {
      const mockMsg = {
        message: 'Dear Karim, please complete your follow-up.',
        missingVitals: ['Temperature'],
        missingSymptoms: ['Pain Level'],
      };

      service.getPersonalizedMessage(coordId, 'p1').subscribe((res) => {
        expect(res.missingVitals).toContain('Temperature');
        expect(res.missingSymptoms).toContain('Pain Level');
      });

      const req = httpMock.expectOne(`${apiUrl}/${coordId}/patients/p1/message`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMsg);
    });
  });

  describe('buildReminderMessages', () => {
    it('should include combined message when both vitals and symptoms are missing', () => {
      const msgs = buildReminderMessages(['Temperature', 'Weight'], ['Pain Level']);
      const combined = msgs.find((m) => m.label.includes('vitals + symptoms'));
      expect(combined).toBeDefined();
    });

    it('should include vitals-only message when only vitals are missing', () => {
      const msgs = buildReminderMessages(['Temperature'], []);
      const vitalsMsg = msgs.find((m) => m.label.toLowerCase().includes('vitals'));
      expect(vitalsMsg).toBeDefined();
      expect(vitalsMsg?.value).toContain('Temperature');
    });

    it('should include symptoms-only message when only symptoms are missing', () => {
      const msgs = buildReminderMessages([], ['Fatigue Level']);
      const symptomsMsg = msgs.find((m) => m.label.toLowerCase().includes('symptoms'));
      expect(symptomsMsg).toBeDefined();
      expect(symptomsMsg?.value).toContain('Fatigue Level');
    });

    it('should always include a general follow-up message', () => {
      const msgs = buildReminderMessages([], []);
      const general = msgs.find((m) => m.label === 'General follow-up reminder');
      expect(general).toBeDefined();
    });

    it('should return at least 1 message even with no missing fields', () => {
      const msgs = buildReminderMessages([], []);
      expect(msgs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
