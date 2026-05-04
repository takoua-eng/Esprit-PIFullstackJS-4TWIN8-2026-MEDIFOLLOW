import { Test, TestingModule } from '@nestjs/testing';
import { SymptomsController } from './symptoms.controller';
import { SymptomsService } from './symptoms.service';

describe('SymptomsController', () => {
  let controller: SymptomsController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymptomsController],
      providers: [{ provide: SymptomsService, useValue: mockService }],
    }).compile();

    controller = module.get<SymptomsController>(SymptomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
