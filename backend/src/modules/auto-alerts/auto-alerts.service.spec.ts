import { Test, TestingModule } from '@nestjs/testing';
import { AutoAlertsService } from './auto-alerts.service';

describe('AutoAlertsService', () => {
  let service: AutoAlertsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [{ provide: AutoAlertsService, useValue: {} }],
    }).compile();

    service = module.get<AutoAlertsService>(AutoAlertsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
