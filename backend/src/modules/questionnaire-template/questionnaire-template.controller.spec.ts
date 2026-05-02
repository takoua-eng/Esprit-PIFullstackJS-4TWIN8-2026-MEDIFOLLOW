import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireTemplateController } from './questionnaire-template.controller';
import { QuestionnaireTemplateService } from './questionnaire-template.service';
import { CreateTemplateDto } from './dto/create-template.dto';

describe('QuestionnaireTemplateController', () => {
  let controller: QuestionnaireTemplateController;
  let service: QuestionnaireTemplateService;

  const mockTemplate = {
    _id: '60d5ecb8b392d70015345678',
    title: 'Test Template',
    category: 'General',
    allowDoctorToAddQuestions: true,
    questions: [],
  };

  beforeEach(async () => {
    const mockService = {
      create: jest.fn().mockResolvedValue(mockTemplate),
      findAll: jest.fn().mockResolvedValue([mockTemplate]),
      findOne: jest.fn().mockResolvedValue(mockTemplate),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionnaireTemplateController],
      providers: [
        {
          provide: QuestionnaireTemplateService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<QuestionnaireTemplateController>(QuestionnaireTemplateController);
    service = module.get<QuestionnaireTemplateService>(QuestionnaireTemplateService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new template', async () => {
      const dto: CreateTemplateDto = {
        title: 'Test Template',
        category: 'General',
        allowDoctorToAddQuestions: true,
        questions: []
      };

      const result = await controller.create(dto);
      
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockTemplate as any);
    });
  });

  describe('findAll', () => {
    it('should return an array of templates', async () => {
      const result = await controller.findAll();
      
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockTemplate] as any[]);
    });
  });

  describe('findOne', () => {
    it('should return a single template by id', async () => {
      const result = await controller.findOne('123');
      
      expect(service.findOne).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockTemplate as any);
    });
  });
});
