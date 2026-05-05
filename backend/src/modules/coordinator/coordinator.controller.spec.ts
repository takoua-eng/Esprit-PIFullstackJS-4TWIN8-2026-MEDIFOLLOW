import { Test, TestingModule } from '@nestjs/testing';
import { CoordinatorController } from './coordinator.controller';
import { CoordinatorService } from './coordinator.service';
import { NotificationService } from '../notifications/notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';


// ── Mock CoordinatorService ───────────────────────────────

const mockCoordinatorService = {
  getDashboard: jest.fn(),
  getAssignedPatients: jest.fn(),
  getComplianceToday: jest.fn(),
  getReminders: jest.fn(),
  createReminder: jest.fn(),
  sendReminder: jest.fn(),
  cancelReminder: jest.fn(),
  deleteReminder: jest.fn(),
  updateReminder: jest.fn(),
  getPersonalizedMessage: jest.fn(),
  getPrediction: jest.fn(),
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendSms: jest.fn(),
  buildEmailHtml: jest.fn().mockReturnValue('<html>test</html>'),
};

// ── Tests ─────────────────────────────────────────────────

describe('CoordinatorController', () => {
  let controller: CoordinatorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoordinatorController],
      providers: [
        { provide: CoordinatorService, useValue: mockCoordinatorService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CoordinatorController>(CoordinatorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Controller defined ────────────────────────────────

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ── 2. getDashboard ──────────────────────────────────────

  describe('getDashboard', () => {
    it('should call service.getDashboard with coordinatorId', async () => {
      const mockResult = { summary: { totalAssignedPatients: 3 } };
      mockCoordinatorService.getDashboard.mockResolvedValue(mockResult);

      const result = await controller.getDashboard('coord123');

      expect(mockCoordinatorService.getDashboard).toHaveBeenCalledWith('coord123');
      expect(result).toEqual(mockResult);
    });
  });

  // ── 3. getAssignedPatients ───────────────────────────────

  describe('getAssignedPatients', () => {
    it('should return assigned patients list', async () => {
      const mockPatients = [
        { _id: 'p1', name: 'Karim Sassi', department: 'Cardiology' },
        { _id: 'p2', name: 'Nada Ben Ali', department: 'Oncology' },
      ];
      mockCoordinatorService.getAssignedPatients.mockResolvedValue(mockPatients);

      const result = await controller.getAssignedPatients('coord123');

      expect(mockCoordinatorService.getAssignedPatients).toHaveBeenCalledWith('coord123');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no patients assigned', async () => {
      mockCoordinatorService.getAssignedPatients.mockResolvedValue([]);

      const result = await controller.getAssignedPatients('coord123');

      expect(result).toEqual([]);
    });
  });

  // ── 4. getComplianceToday ────────────────────────────────

  describe('getComplianceToday', () => {
    it('should return compliance data for today', async () => {
      const mockCompliance = [
        { _id: 'p1', name: 'Karim Sassi', isFullyCompliant: true },
        { _id: 'p2', name: 'Nada Ben Ali', isFullyCompliant: false },
      ];
      mockCoordinatorService.getComplianceToday.mockResolvedValue(mockCompliance);

      const result = await controller.getComplianceToday('coord123');

      expect(mockCoordinatorService.getComplianceToday).toHaveBeenCalledWith('coord123');
      expect(result).toEqual(mockCompliance);
    });
  });

  // ── 5. getReminders ──────────────────────────────────────

  describe('getReminders', () => {
    it('should return reminders for coordinator', async () => {
      const mockReminders = [
        { _id: 'r1', type: 'follow_up', status: 'sent' },
        { _id: 'r2', type: 'follow_up', status: 'scheduled' },
      ];
      mockCoordinatorService.getReminders.mockResolvedValue(mockReminders);

      const result = await controller.getReminders('coord123');

      expect(mockCoordinatorService.getReminders).toHaveBeenCalledWith('coord123');
      expect(result).toHaveLength(2);
    });
  });

  // ── 6. createReminder ────────────────────────────────────

  describe('createReminder', () => {
    it('should create a reminder and return it', async () => {
      const body = {
        patientId: 'p1',
        type: 'follow_up',
        message: 'Please complete your daily follow-up.',
        scheduledAt: new Date().toISOString(),
      };
      const mockCreated = { _id: 'r1', ...body, status: 'scheduled' };
      mockCoordinatorService.createReminder.mockResolvedValue(mockCreated);

      const result = await controller.createReminder('coord123', body);

      expect(mockCoordinatorService.createReminder).toHaveBeenCalledWith('coord123', body);
      expect(result).toEqual(mockCreated);
    });
  });

  // ── 7. sendReminder ──────────────────────────────────────

  describe('sendReminder', () => {
    it('should call sendReminder with reminderId', async () => {
      const mockSent = { _id: 'r1', status: 'sent', emailSent: true };
      mockCoordinatorService.sendReminder.mockResolvedValue(mockSent);

      const result = await controller.sendReminder('r1');

      expect(mockCoordinatorService.sendReminder).toHaveBeenCalledWith('r1');
      expect(result.status).toBe('sent');
    });
  });

  // ── 8. cancelReminder ────────────────────────────────────

  describe('cancelReminder', () => {
    it('should cancel reminder and return updated reminder', async () => {
      const mockCancelled = { _id: 'r1', status: 'cancelled' };
      mockCoordinatorService.cancelReminder.mockResolvedValue(mockCancelled);

      const result = await controller.cancelReminder('r1');

      expect(mockCoordinatorService.cancelReminder).toHaveBeenCalledWith('r1');
      expect(result.status).toBe('cancelled');
    });
  });

  // ── 9. deleteReminder ────────────────────────────────────

  describe('deleteReminder', () => {
    it('should delete reminder and return success message', async () => {
      mockCoordinatorService.deleteReminder.mockResolvedValue({ message: 'Reminder deleted' });

      const result = await controller.deleteReminder('r1');

      expect(mockCoordinatorService.deleteReminder).toHaveBeenCalledWith('r1');
      expect(result).toEqual({ message: 'Reminder deleted' });
    });
  });

  // ── 10. updateReminder ───────────────────────────────────

  describe('updateReminder', () => {
    it('should update reminder fields', async () => {
      const body = { type: 'urgent', message: 'Updated message', scheduledAt: new Date().toISOString() };
      const mockUpdated = { _id: 'r1', ...body };
      mockCoordinatorService.updateReminder.mockResolvedValue(mockUpdated);

      const result = await controller.updateReminder('r1', body);

      expect(mockCoordinatorService.updateReminder).toHaveBeenCalledWith('r1', body);
      expect(result).toEqual(mockUpdated);
    });
  });

  // ── 11. getPersonalizedMessage ───────────────────────────

  describe('getPersonalizedMessage', () => {
    it('should return personalized message with missing fields', async () => {
      const mockMsg = {
        message: 'Dear Karim, please complete your follow-up.',
        missingVitals: ['Temperature', 'Weight'],
        missingSymptoms: [],
      };
      mockCoordinatorService.getPersonalizedMessage.mockResolvedValue(mockMsg);

      const result = await controller.getPersonalizedMessage('coord123', 'p1');

      expect(mockCoordinatorService.getPersonalizedMessage).toHaveBeenCalledWith('coord123', 'p1');
      expect(result.missingVitals).toContain('Temperature');
    });
  });

  // ── 12. getPrediction ────────────────────────────────────

  describe('getPrediction', () => {
    it('should return prediction data sorted by riskScore', async () => {
      const mockPrediction = {
        generatedAt: new Date().toISOString(),
        periodDays: 14,
        patients: [
          { patientId: 'p1', name: 'Karim Sassi', riskLevel: 'HIGH', riskScore: 80 },
          { patientId: 'p2', name: 'Nada Ben Ali', riskLevel: 'LOW', riskScore: 10 },
        ],
      };
      mockCoordinatorService.getPrediction.mockResolvedValue(mockPrediction);

      const result = await controller.getPrediction('coord123');

      expect(mockCoordinatorService.getPrediction).toHaveBeenCalledWith('coord123');
      expect(result.patients[0].riskLevel).toBe('HIGH');
    });
  });
});
