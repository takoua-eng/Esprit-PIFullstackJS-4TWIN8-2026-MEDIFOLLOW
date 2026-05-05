import { Test, TestingModule } from '@nestjs/testing';
import { SymptomsController } from './symptoms.controller';
import { SymptomsService } from './symptoms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
describe('SymptomsController', () => {
  let controller: SymptomsController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SymptomsController],
      providers: [{ provide: SymptomsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SymptomsController>(SymptomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
