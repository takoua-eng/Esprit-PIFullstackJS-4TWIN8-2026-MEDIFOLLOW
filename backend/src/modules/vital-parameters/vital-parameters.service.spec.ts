import { Test, TestingModule } from '@nestjs/testing';
import { VitalParametersService } from './vital-parameters.service';

describe('VitalParametersService', () => {
  let service: VitalParametersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: VitalParametersService, useValue: {} }],
    }).compile();

    service = module.get<VitalParametersService>(VitalParametersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
