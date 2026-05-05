import { Test, TestingModule } from '@nestjs/testing';
import { AutoAlertsController } from './auto-alerts.controller';
import { AutoAlertsService } from './auto-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
describe('AutoAlertsController', () => {
  let controller: AutoAlertsController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoAlertsController],
      providers: [{ provide: AutoAlertsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AutoAlertsController>(AutoAlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
