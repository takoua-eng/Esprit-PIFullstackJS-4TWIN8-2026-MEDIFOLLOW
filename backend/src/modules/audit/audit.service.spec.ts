import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from './entities/audit.schema';
import { NotFoundException } from '@nestjs/common';

const mockLog = {
  _id: 'log123',
  userId: 'user1',
  userEmail: 'admin@test.com',
  userRole: 'super-admin',
  action: 'CREATE',
  entityType: 'USERS_PATIENTS',
  entityId: 'patient1',
  ipAddress: '127.0.0.1',
  createdAt: new Date(),
};

const mockSave = jest.fn().mockResolvedValue(mockLog);

const mockModel = jest.fn().mockImplementation(() => ({ save: mockSave })) as any;
mockModel.find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([mockLog]) }) });
mockModel.findById = jest.fn().mockResolvedValue(mockLog);
mockModel.findByIdAndDelete = jest.fn().mockResolvedValue(mockLog);
mockModel.countDocuments = jest.fn().mockResolvedValue(5);
mockModel.aggregate = jest.fn().mockResolvedValue([]);

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getModelToken(AuditLog.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create and save an audit log', async () => {
      mockSave.mockResolvedValueOnce(mockLog);
      const result = await service.create({ action: 'CREATE', entityType: 'PATIENT' });
      expect(mockSave).toHaveBeenCalled();
      expect(result).toEqual(mockLog);
    });
  });

  describe('findAll()', () => {
    it('should return all audit logs', async () => {
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([mockLog]) }),
      });
      const result = await service.findAll();
      expect(result).toEqual([mockLog]);
    });
  });

  describe('findOne()', () => {
    it('should return a log by id', async () => {
      mockModel.findById.mockResolvedValueOnce(mockLog);
      const result = await service.findOne('log123');
      expect(result).toEqual(mockLog);
    });

    it('should throw NotFoundException if log not found', async () => {
      mockModel.findById.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('should delete a log and return success message', async () => {
      mockModel.findByIdAndDelete.mockResolvedValueOnce(mockLog);
      const result = await service.remove('log123');
      expect(result).toEqual({ message: 'Deleted successfully' });
    });

    it('should throw NotFoundException if log not found', async () => {
      mockModel.findByIdAndDelete.mockResolvedValueOnce(null);
      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStats()', () => {
    it('should return stats object with all required fields', async () => {
      mockModel.countDocuments.mockResolvedValue(10);
      mockModel.aggregate.mockResolvedValue([]);

      const stats = await service.getStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byAction');
      expect(stats).toHaveProperty('byEntity');
      expect(stats).toHaveProperty('byUser');
      expect(stats).toHaveProperty('last24h');
      expect(stats).toHaveProperty('last7days');
      expect(stats).toHaveProperty('criticalChanges');
      expect(stats).toHaveProperty('loginCount');
      expect(stats).toHaveProperty('patientModifications');
      expect(stats).toHaveProperty('alertsGenerated');
      expect(stats).toHaveProperty('totalLast7days');
    });
  });
});
