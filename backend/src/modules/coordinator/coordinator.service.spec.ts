import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { CoordinatorService } from './coordinator.service';
import { NotificationService } from '../notifications/notification.service';
import { User } from '../users/users.schema';
import { Reminder } from './reminder.schema';
import { Role } from '../roles/role.schema';

// ── Mocks ─────────────────────────────────────────────────

const mockUserModel = {
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockRoleModel = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockVitalModel = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockSymptomModel = {
  find: jest.fn(),
  findOne: jest.fn(),
};

const mockNotificationService = {
  sendEmail: jest.fn(),
  sendSms: jest.fn(),
  buildEmailHtml: jest.fn().mockReturnValue('<html>test</html>'),
  buildSmsMessage: jest.fn().mockReturnValue('Test SMS'),
  askAI: jest.fn(),
};

// ── Helper : créer le ReminderModel mockable ──────────────

function createMockReminderModel() {
  const instance = {
    save: jest.fn().mockResolvedValue({ _id: 'reminder123' }),
  };
  const constructor: any = jest.fn().mockImplementation(() => instance);
  constructor.find = jest.fn();
  constructor.findById = jest.fn();
  constructor.findByIdAndUpdate = jest.fn();
  constructor.findByIdAndDelete = jest.fn();
  constructor.countDocuments = jest.fn();
  return constructor;
}

// ── Tests ─────────────────────────────────────────────────

describe('CoordinatorService', () => {
  let service: CoordinatorService;
  let ReminderModelMock: any;

  beforeEach(async () => {
    ReminderModelMock = createMockReminderModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoordinatorService,
        { provide: getModelToken(User.name),        useValue: mockUserModel },
        { provide: getModelToken(Reminder.name),    useValue: ReminderModelMock },
        { provide: getModelToken(Role.name),        useValue: mockRoleModel },
        { provide: getModelToken('VitalParameter'), useValue: mockVitalModel },
        { provide: getModelToken('Symptom'),        useValue: mockSymptomModel },
        { provide: NotificationService,             useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<CoordinatorService>(CoordinatorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Service defined ───────────────────────────────────

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── 2. checkVitalFields ──────────────────────────────────

  describe('checkVitalFields', () => {
    it('should return empty array when all vitals are present', () => {
      const doc = {
        temperature: 37.0,
        heartRate: 72,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        weight: 70,
      };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toEqual([]);
    });

    it('should detect missing temperature', () => {
      const doc = { temperature: null, heartRate: 72, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, weight: 70 };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toContain('Temperature');
    });

    it('should detect missing heartRate', () => {
      const doc = { temperature: 37.0, heartRate: null, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, weight: 70 };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toContain('Heart Rate');
    });

    it('should detect missing blood pressure when systolic is null', () => {
      const doc = { temperature: 37.0, heartRate: 72, bloodPressureSystolic: null, bloodPressureDiastolic: 80, weight: 70 };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toContain('Blood Pressure');
    });

    it('should detect missing weight', () => {
      const doc = { temperature: 37.0, heartRate: 72, bloodPressureSystolic: 120, bloodPressureDiastolic: 80, weight: null };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toContain('Weight');
    });

    it('should detect all missing vitals', () => {
      const doc = { temperature: null, heartRate: null, bloodPressureSystolic: null, bloodPressureDiastolic: null, weight: null };
      const result = (service as any).checkVitalFields(doc);
      expect(result).toHaveLength(4);
    });
  });

  // ── 3. checkSymptomFields ────────────────────────────────

  describe('checkSymptomFields', () => {
    it('should return empty array when all symptom fields are present', () => {
      const doc = { painLevel: 2, fatigueLevel: 1, symptoms: ['fatigue'] };
      const result = (service as any).checkSymptomFields(doc);
      expect(result).toEqual([]);
    });

    it('should detect missing painLevel', () => {
      const doc = { painLevel: null, fatigueLevel: 1, symptoms: ['fatigue'] };
      const result = (service as any).checkSymptomFields(doc);
      expect(result).toContain('Pain Level');
    });

    it('should detect missing fatigueLevel', () => {
      const doc = { painLevel: 2, fatigueLevel: null, symptoms: ['fatigue'] };
      const result = (service as any).checkSymptomFields(doc);
      expect(result).toContain('Fatigue Level');
    });

    it('should detect empty symptoms array', () => {
      const doc = { painLevel: 2, fatigueLevel: 1, symptoms: [] };
      const result = (service as any).checkSymptomFields(doc);
      expect(result).toContain('Symptoms List');
    });

    it('should detect all missing symptom fields', () => {
      const doc = { painLevel: null, fatigueLevel: null, symptoms: [] };
      const result = (service as any).checkSymptomFields(doc);
      expect(result).toHaveLength(3);
    });
  });

  // ── 4. buildPersonalizedMessage ──────────────────────────

  describe('buildPersonalizedMessage', () => {
    it('should return general message when everything is missing', () => {
      const msg = service.buildPersonalizedMessage(
        'Karim Sassi',
        ['Temperature', 'Heart Rate', 'Blood Pressure', 'Weight'],
        ['Pain Level', 'Fatigue Level', 'Symptoms List'],
      );
      expect(msg).toContain('Karim');
      expect(msg).toContain('Vital Parameters');
      expect(msg).toContain('Symptoms');
    });

    it('should return vitals-only message when only vitals are missing', () => {
      const msg = service.buildPersonalizedMessage(
        'Nada Ben Khaled',
        ['Temperature', 'Heart Rate', 'Blood Pressure', 'Weight'],
        [],
      );
      expect(msg).toContain('Nada');
      expect(msg).toContain('Vital Parameters');
    });

    it('should return symptoms-only message when only symptoms are missing', () => {
      const msg = service.buildPersonalizedMessage(
        'Sarra Maatoug',
        [],
        ['Pain Level', 'Fatigue Level', 'Symptoms List'],
      );
      expect(msg).toContain('Sarra');
      expect(msg).toContain('Symptoms');
    });

    it('should mention specific missing fields in partial case', () => {
      const msg = service.buildPersonalizedMessage(
        'Ahmed Ben Khaled',
        ['Heart Rate', 'Weight'],
        ['Fatigue Level'],
      );
      expect(msg).toContain('Heart Rate');
      expect(msg).toContain('Weight');
      expect(msg).toContain('Fatigue Level');
    });

    it('should use first name only', () => {
      const msg = service.buildPersonalizedMessage('Karim Sassi', ['Temperature'], []);
      expect(msg).toContain('Karim');
      expect(msg).not.toContain('Sassi');
    });
  });

  // ── 5. getTodayRange ─────────────────────────────────────

  describe('getTodayRange', () => {
    it('should return start at midnight', () => {
      const { start } = (service as any).getTodayRange();
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });

    it('should return end at 23:59:59', () => {
      const { end } = (service as any).getTodayRange();
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
    });

    it('should return same day for start and end', () => {
      const { start, end } = (service as any).getTodayRange();
      expect(start.toDateString()).toBe(end.toDateString());
    });
  });

  // ── 6. getDashboard ──────────────────────────────────────

  describe('getDashboard', () => {
    it('should throw NotFoundException when coordinator not found', async () => {
      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.getDashboard('nonexistentId')).rejects.toThrow(NotFoundException);
    });

    it('should return dashboard summary when coordinator exists', async () => {
      const mockCoordinator = {
        assignedPatients: [
          {
            _id: 'p1',
            firstName: 'Nada', lastName: 'Ben Khaled',
            email: 'nada@test.com', department: 'Cardio',
            phone: '12345', address: 'Tunis',
            emergencyContact: '98765', medicalRecordNumber: 'MRN001',
            updatedAt: new Date(),
          },
        ],
      };

      mockUserModel.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockCoordinator),
        }),
      });

      ReminderModelMock.countDocuments.mockResolvedValue(2);
      mockVitalModel.find.mockResolvedValue([]);
      mockSymptomModel.find.mockResolvedValue([]);

      const result = await service.getDashboard('coordinator123');
      expect(result).toBeDefined();
      expect(result.summary.totalAssignedPatients).toBe(1);
    });
  });

  // ── 7. cancelReminder ────────────────────────────────────

  describe('cancelReminder', () => {
    it('should throw NotFoundException when reminder not found', async () => {
      ReminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancelReminder('nonexistentId')).rejects.toThrow(NotFoundException);
    });

    it('should set status to cancelled', async () => {
      const mockReminder = {
        status: 'scheduled',
        save: jest.fn().mockResolvedValue({ status: 'cancelled' }),
      };

      ReminderModelMock.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockReminder),
      });

      await service.cancelReminder('reminder123');
      expect(mockReminder.status).toBe('cancelled');
      expect(mockReminder.save).toHaveBeenCalled();
    });
  });

  // ── 8. deleteReminder ────────────────────────────────────

  describe('deleteReminder', () => {
    it('should throw NotFoundException when reminder not found', async () => {
      ReminderModelMock.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteReminder('nonexistentId')).rejects.toThrow(NotFoundException);
    });

    it('should return success message when deleted', async () => {
      ReminderModelMock.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'reminder123' }),
      });

      const result = await service.deleteReminder('reminder123');
      expect(result).toEqual({ message: 'Reminder deleted' });
    });
  });

  // ── 9. getDateRange ──────────────────────────────────────

  describe('getDateRange', () => {
    it('should return range of N days back', () => {
      const { start, end } = (service as any).getDateRange(7);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it('should set start hours to midnight', () => {
      const { start } = (service as any).getDateRange(14);
      expect(start.getHours()).toBe(0);
      expect(start.getSeconds()).toBe(0);
    });
  });
});
