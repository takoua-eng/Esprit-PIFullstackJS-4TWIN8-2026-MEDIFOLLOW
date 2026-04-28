import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

const lean = (data: any) => ({
  lean: jest.fn().mockResolvedValue(data),
});

const mockQuery = (data: any) => ({
  lean: jest.fn().mockResolvedValue(data),
});

const mockModel = {
  find: jest.fn(() => mockQuery([])),
  findOne: jest.fn(() => mockQuery(null)),
  findById: jest.fn().mockResolvedValue(null),
  countDocuments: jest.fn().mockResolvedValue(0),
  aggregate: jest.fn().mockResolvedValue([]),
  distinct: jest.fn().mockResolvedValue([]),
};

const mockConfig = {
  get: jest.fn((key: string) => {
    if (key === 'GEMINI_API_KEY') return 'fake';
    if (key === 'GEMINI_MODEL') return 'model';
    if (key === 'GROQ_API_KEY') return 'groq';
    return null;
  }),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: getModelToken('AiUser'), useValue: mockModel },
        { provide: getModelToken('AiReminder'), useValue: mockModel },
        { provide: getModelToken('AiRole'), useValue: mockModel },
        { provide: getModelToken('AiVital'), useValue: mockModel },
        { provide: getModelToken('AiSymptom'), useValue: mockModel },
        { provide: getModelToken('AiAuditLog'), useValue: mockModel },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('chat fallback', async () => {
    (service as any).geminiClient = null;

    const res = await service.chatWithPatient('hi');

    expect(typeof res).toBe('string');
  });

  it('collectData', async () => {
    mockModel.findOne.mockReturnValue(mockQuery({ _id: '1' }));
    mockModel.find.mockReturnValue(mockQuery([]));
    mockModel.distinct.mockResolvedValue([]);

    const result = await (service as any).collectData();

    expect(result).toBeDefined();
  });

  it('predictStrokeRisk error', async () => {
    mockModel.findById.mockResolvedValue(null);

    await expect(service.predictStrokeRisk('1')).rejects.toThrow();
  });
});