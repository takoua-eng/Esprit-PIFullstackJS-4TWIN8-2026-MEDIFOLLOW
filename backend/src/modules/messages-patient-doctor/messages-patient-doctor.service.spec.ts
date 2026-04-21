import { Test, TestingModule } from '@nestjs/testing';
import { MessagesPatientDoctorService } from './messages-patient-doctor.service';

describe('MessagesPatientDoctorService', () => {
  let service: MessagesPatientDoctorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessagesPatientDoctorService],
    }).compile();

    service = module.get<MessagesPatientDoctorService>(MessagesPatientDoctorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
