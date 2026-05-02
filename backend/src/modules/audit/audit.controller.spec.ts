import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('AuditController - Unit Tests', () => {
  let controller: AuditController;

  const mockAuditService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    getStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    })
      // bypass auth guard
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuditController>(AuditController);

    jest.clearAllMocks();
  });

  // =====================
  // 🧪 CREATE
  // =====================
  it('should create audit', async () => {
    const dto = { action: 'CREATE' };
    const result = { _id: '1', ...dto };

    mockAuditService.create.mockResolvedValue(result);

    const res = await controller.create(dto as any);

    expect(res).toEqual(result);
    expect(mockAuditService.create).toHaveBeenCalledWith(dto);
  });

  // =====================
  // 🧪 FIND ALL
  // =====================
  it('should return all audits', async () => {
    const data = [{ _id: '1' }];

    mockAuditService.findAll.mockResolvedValue(data);

    const res = await controller.findAll();

    expect(res).toEqual(data);
    expect(mockAuditService.findAll).toHaveBeenCalled();
  });

  // =====================
  // 🧪 FIND ONE
  // =====================
  it('should return audit by id', async () => {
    const audit = { _id: '1' };

    mockAuditService.findOne.mockResolvedValue(audit);

    const res = await controller.findOne('1');

    expect(res).toEqual(audit);
    expect(mockAuditService.findOne).toHaveBeenCalledWith('1');
  });

  // =====================
  // 🧪 REMOVE
  // =====================
  it('should delete audit', async () => {
    const result = { message: 'Deleted successfully' };

    mockAuditService.remove.mockResolvedValue(result);

    const res = await controller.remove('1');

    expect(res).toEqual(result);
    expect(mockAuditService.remove).toHaveBeenCalledWith('1');
  });

  // =====================
  // 🧪 STATS
  // =====================
  it('should return stats', async () => {
    const stats = { total: 10 };

    mockAuditService.getStats.mockResolvedValue(stats);

    const res = await controller.getStats();

    expect(res).toEqual(stats);
    expect(mockAuditService.getStats).toHaveBeenCalled();
  });
});