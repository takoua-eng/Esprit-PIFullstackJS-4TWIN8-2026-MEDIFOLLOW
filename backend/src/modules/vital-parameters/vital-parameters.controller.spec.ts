import { Test, TestingModule } from '@nestjs/testing';
import { VitalParametersController } from './vital-parameters.controller';
import { VitalParametersService } from './vital-parameters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
describe('VitalParametersController', () => {
  let controller: VitalParametersController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VitalParametersController],
      providers: [{ provide: VitalParametersService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<VitalParametersController>(VitalParametersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
