import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';

const mockLog = {
  _id: 'log123',
  userEmail: 'admin@test.com',
  action: 'CREATE',
  entityType: 'PATIENT',
  createdAt: new Date(),
};

const mockStats = {
  total: 100,
  byAction: [],
  byEntity: [],
  byUser: [],
  last24h: [],
  last7days: [],
  criticalChanges: 3,
  loginCount: 20,
  patientModifications: 10,
  alertsGenerated: 5,
  totalLast7days: 50,
};

const mockAuditService = {
  create: jest.fn().mockResolvedValue(mockLog),
  findAll: jest.fn().mockResolvedValue([mockLog]),
  findOne: jest.fn().mockResolvedValue(mockLog),
  remove: jest.fn().mockResolvedValue({ message: 'Deleted successfully' }),
  getStats: jest.fn().mockResolvedValue(mockStats),
};

describe('AuditController', () => {
  let controller: AuditController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [{ provide: AuditService, useValue: mockAuditService }],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /audit', () => {
    it('should create an audit log', async () => {
      const dto = { action: 'CREATE', entityType: 'PATIENT' };
      const result = await controller.create(dto as any);
      expect(mockAuditService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockLog);
    });
  });

  describe('GET /audit', () => {
    it('should return all audit logs', async () => {
      const result = await controller.findAll();
      expect(mockAuditService.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockLog]);
    });
  });

  describe('GET /audit/stats', () => {
    it('should return audit statistics', async () => {
      const result = await controller.getStats();
      expect(mockAuditService.getStats).toHaveBeenCalled();
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('criticalChanges');
      expect(result).toHaveProperty('loginCount');
    });
  });

  describe('GET /audit/:id', () => {
    it('should return a single audit log', async () => {
      const result = await controller.findOne('log123');
      expect(mockAuditService.findOne).toHaveBeenCalledWith('log123');
      expect(result).toEqual(mockLog);
    });
  });

  describe('DELETE /audit/:id', () => {
    it('should delete an audit log', async () => {
      const result = await controller.remove('log123');
      expect(mockAuditService.remove).toHaveBeenCalledWith('log123');
      expect(result).toEqual({ message: 'Deleted successfully' });
    });
  });
});
