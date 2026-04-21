import { TestBed } from '@angular/core/testing';

import { MessagesPatientDoctorService } from './messages-patient-doctor.service';

describe('MessagesPatientDoctorService', () => {
  let service: MessagesPatientDoctorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessagesPatientDoctorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
