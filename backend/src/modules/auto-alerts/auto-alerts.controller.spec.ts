import { Test, TestingModule } from '@nestjs/testing';
import { AutoAlertsController } from './auto-alerts.controller';
import { AutoAlertsService } from './auto-alerts.service';

describe('AutoAlertsController', () => {
  let controller: AutoAlertsController;

  beforeEach(async () => {
    const mockService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutoAlertsController],
      providers: [{ provide: AutoAlertsService, useValue: mockService }],
    }).compile();

    controller = module.get<AutoAlertsController>(AutoAlertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
