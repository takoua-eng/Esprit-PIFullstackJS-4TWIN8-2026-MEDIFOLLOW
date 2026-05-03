import { Test, TestingModule } from '@nestjs/testing';
import { VitalParametersController } from './vital-parameters.controller';
import { VitalParametersService } from './vital-parameters.service';

describe('VitalParametersController', () => {
  let controller: VitalParametersController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VitalParametersController],
      providers: [{ provide: VitalParametersService, useValue: mockService }],
    }).compile();

    controller = module.get<VitalParametersController>(VitalParametersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
