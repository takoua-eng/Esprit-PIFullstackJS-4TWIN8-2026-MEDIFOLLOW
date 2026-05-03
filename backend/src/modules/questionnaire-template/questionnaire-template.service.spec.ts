import { Test, TestingModule } from '@nestjs/testing';
import { QuestionnaireTemplateService } from './questionnaire-template.service';
import { getModelToken } from '@nestjs/mongoose';
import { QuestionnaireTemplate } from './questionnaire-template.schema';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';

describe('QuestionnaireTemplateService', () => {
  let service: QuestionnaireTemplateService;
  let mockTemplateModel: any;

  const mockTemplate = {
    _id: '60d5ecb8b392d70015345678',
    title: 'Test Template',
    category: 'General',
    allowDoctorToAddQuestions: true,
    questions: [
      { label: 'Question 1', type: 'text', options: [], required: true }
    ],
  };

  beforeEach(async () => {
    mockTemplateModel = {
      create: jest.fn().mockResolvedValue(mockTemplate),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockTemplate])
        })
      }),
      findById: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplate)
      }),
      findByIdAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockTemplate)
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionnaireTemplateService,
        {
          provide: getModelToken(QuestionnaireTemplate.name),
          useValue: mockTemplateModel,
        },
      ],
    }).compile();

    service = module.get<QuestionnaireTemplateService>(QuestionnaireTemplateService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      const dto: CreateTemplateDto = {
        title: 'Test Template',
        category: 'General',
        allowDoctorToAddQuestions: true,
        questions: [{ label: 'Question 1', type: 'text', required: true }]
      };

      const result = await service.create(dto);

      expect(mockTemplateModel.create).toHaveBeenCalledWith({
        title: dto.title,
        category: dto.category,
        allowDoctorToAddQuestions: dto.allowDoctorToAddQuestions,
        questions: [{ label: 'Question 1', type: 'text', options: [], required: true }],
      });
      expect(result).toEqual(mockTemplate as any);
    });

    it('should throw InternalServerErrorException if creation fails', async () => {
      mockTemplateModel.create.mockRejectedValue(new Error('DB Error'));
      
      const dto = { title: 'Test', category: 'General', allowDoctorToAddQuestions: false, questions: [] };
      await expect(service.create(dto as any)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('should return all templates sorted by _id desc', async () => {
      const result = await service.findAll();
      
      expect(mockTemplateModel.find).toHaveBeenCalled();
      expect(mockTemplateModel.find().sort).toHaveBeenCalledWith({ _id: -1 });
      expect(result).toEqual([mockTemplate] as any[]);
    });

    it('should throw InternalServerErrorException if find fails', async () => {
      mockTemplateModel.find.mockReturnValue({
        sort: () => ({
          exec: () => Promise.reject(new Error('DB Error'))
        })
      });
      
      await expect(service.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('findOne', () => {
    it('should return a template by id', async () => {
      const result = await service.findOne('123');
      
      expect(mockTemplateModel.findById).toHaveBeenCalledWith('123');
      expect(result).toEqual(mockTemplate as any);
    });

    it('should throw BadRequestException if id is missing or empty', async () => {
      await expect(service.findOne('')).rejects.toThrow(BadRequestException);
      await expect(service.findOne(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if template is not found', async () => {
      mockTemplateModel.findById.mockReturnValue({ exec: () => Promise.resolve(null) });
      
      await expect(service.findOne('123')).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      mockTemplateModel.findById.mockReturnValue({ exec: () => Promise.reject(new Error('DB Error')) });
      
      await expect(service.findOne('123')).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('should update a template successfully', async () => {
      const dto: CreateTemplateDto = {
        title: 'Updated',
        category: 'Test',
        allowDoctorToAddQuestions: false,
        questions: [{ label: 'Q1', type: 'text', options: ['A'], required: false }]
      };

      const result = await service.update('123', dto);

      expect(mockTemplateModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        {
          title: 'Updated',
          category: 'Test',
          allowDoctorToAddQuestions: false,
          questions: [{ label: 'Q1', type: 'text', options: ['A'], required: false }],
        },
        { new: true, runValidators: true }
      );
      expect(result).toEqual(mockTemplate as any);
    });

    it('should throw BadRequestException if id is missing', async () => {
      await expect(service.update('  ', {} as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if template is not found to update', async () => {
      mockTemplateModel.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.resolve(null) });
      
      await expect(service.update('123', { questions: [] } as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException for unexpected errors', async () => {
      mockTemplateModel.findByIdAndUpdate.mockReturnValue({ exec: () => Promise.reject(new Error('DB Error')) });
      
      await expect(service.update('123', { questions: [] } as any)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
