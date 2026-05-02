import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getModelToken } from '@nestjs/mongoose';

describe('AuditService - Unit Tests', () => {
  let service: AuditService;

  const mockAuditModel = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockSave = jest.fn();

  const MockModel = jest.fn().mockImplementation(() => ({
    save: mockSave,
  }));

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken('AuditLog'),
          useValue: Object.assign(MockModel, mockAuditModel),
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  // =========================
  // 🧪 CREATE
  // =========================
  it('should create audit log', async () => {
    const data = { action: 'CREATE' };
    const saved = { _id: '1', ...data };

    mockSave.mockResolvedValue(saved);

    const result = await service.create(data);

    expect(result).toEqual(saved);
    expect(mockSave).toHaveBeenCalled();
  });

  // =========================
  // 🧪 FIND ALL
  // =========================
  it('should return all audit logs', async () => {
    const logs = [{ _id: '1' }];

    const limitMock = jest.fn().mockResolvedValue(logs);
    const sortMock = jest.fn().mockReturnValue({ limit: limitMock });

    mockAuditModel.find.mockReturnValue({
      sort: sortMock,
    });

    const result = await service.findAll();

    expect(result).toEqual(logs);
    expect(mockAuditModel.find).toHaveBeenCalled();
  });

  // =========================
  // 🧪 FIND ONE (SUCCESS)
  // =========================
  it('should return audit by id', async () => {
    const log = { _id: '1', action: 'TEST' };

    mockAuditModel.findById.mockResolvedValue(log);

    const result = await service.findOne('1');

    expect(result).toEqual(log);
    expect(mockAuditModel.findById).toHaveBeenCalledWith('1');
  });

  // =========================
  // 🧪 FIND ONE (NOT FOUND)
  // =========================
  it('should throw NotFoundException when audit not found', async () => {
    mockAuditModel.findById.mockResolvedValue(null);

    await expect(service.findOne('1')).rejects.toThrow('Audit log not found');
  });

  // =========================
  // 🧪 REMOVE (SUCCESS)
  // =========================
  it('should delete audit log', async () => {
    mockAuditModel.findByIdAndDelete.mockResolvedValue({ _id: '1' });

    const result = await service.remove('1');

    expect(result).toEqual({ message: 'Deleted successfully' });
  });

  // =========================
  // 🧪 REMOVE (NOT FOUND)
  // =========================
  it('should throw when delete fails', async () => {
    mockAuditModel.findByIdAndDelete.mockResolvedValue(null);

    await expect(service.remove('1')).rejects.toThrow('Audit log not found');
  });

  // =========================
  // 🧪 STATS
  // =========================
  it('should return audit stats', async () => {
    const aggResult = [{ _id: 'x', count: 5 }];
    const daily = [{ _id: '2024-01-01', count: 3 }];

    mockAuditModel.countDocuments
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(5)    // criticalChanges
      .mockResolvedValueOnce(10)   // loginCount
      .mockResolvedValueOnce(7)    // patientModifications
      .mockResolvedValueOnce(2);   // alertsGenerated

    mockAuditModel.aggregate
      .mockResolvedValueOnce(aggResult) // byAction
      .mockResolvedValueOnce(aggResult) // byEntity
      .mockResolvedValueOnce(aggResult) // byUser
      .mockResolvedValueOnce(aggResult) // last24h
      .mockResolvedValueOnce(daily);    // last7days

    const result = await service.getStats();

    expect(result.total).toBe(100);
    expect(result.criticalChanges).toBe(5);
    expect(result.loginCount).toBe(10);
    expect(result.patientModifications).toBe(7);
    expect(result.alertsGenerated).toBe(2);
    expect(result.totalLast7days).toBe(3);
  });
});