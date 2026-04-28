import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { getModelToken } from '@nestjs/mongoose';

const mockLog = { _id: 'log1' };

/**
 * ✅ Mock MODEL Mongoose correct (constructor + instance)
 */
const mockAuditModel: any = jest.fn().mockImplementation((data) => {
  return {
    ...data,
    save: jest.fn().mockResolvedValue(mockLog),
  };
});

/**
 * static methods (Model.find etc.)
 */
mockAuditModel.find = jest.fn().mockReturnValue({
  sort: jest.fn().mockReturnValue({
    limit: jest.fn().mockResolvedValue([mockLog]),
  }),
});

mockAuditModel.findById = jest.fn();
mockAuditModel.findByIdAndDelete = jest.fn();
mockAuditModel.countDocuments = jest.fn();
mockAuditModel.aggregate = jest.fn();

describe('AuditService', () => {
  let service: AuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getModelToken('AuditLog'),
          useValue: mockAuditModel,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create log', async () => {
    const result = await service.create({
      action: 'CREATE',
      entityType: 'USER',
    });

    expect(result).toEqual(mockLog);
  });

  it('should return all logs', async () => {
    const result = await service.findAll();
    expect(result).toEqual([mockLog]);
  });

  it('should throw if not found', async () => {
    mockAuditModel.findById.mockResolvedValue(null);

    await expect(service.findOne('1')).rejects.toThrow();
  });

  it('should remove log', async () => {
    mockAuditModel.findByIdAndDelete.mockResolvedValue(mockLog);

    const res = await service.remove('1');

    expect(res).toEqual({ message: 'Deleted successfully' });
  });

  it('should return stats', async () => {
    mockAuditModel.countDocuments.mockResolvedValue(5);
    mockAuditModel.aggregate.mockResolvedValue([]);

    const res = await service.getStats();

    expect(res).toBeDefined();
  });
});