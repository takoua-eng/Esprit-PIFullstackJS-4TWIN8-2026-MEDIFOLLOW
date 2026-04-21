import { Test, TestingModule } from '@nestjs/testing';
import { MessagesPatientDoctorController } from './messages-patient-doctor.controller';

describe('MessagesPatientDoctorController', () => {
  let controller: MessagesPatientDoctorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesPatientDoctorController],
    }).compile();

    controller = module.get<MessagesPatientDoctorController>(MessagesPatientDoctorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
