import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PatientVideoCallNotifierService } from './patient-video-call-notifier.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VideoCallsApiService } from '../services/video-calls-api.service';

describe('PatientVideoCallNotifierService', () => {
  let service: PatientVideoCallNotifierService;

  beforeEach(() => {
    const routerMock = { events: of(), url: '/dashboard/patient' };
    const videoCallsApiMock = { getPending: () => of(null), dismiss: () => of(null) };
    const matDialogMock = { open: () => ({ afterClosed: () => of(null) }) };

    TestBed.configureTestingModule({
      providers: [
        PatientVideoCallNotifierService,
        { provide: Router, useValue: routerMock },
        { provide: VideoCallsApiService, useValue: videoCallsApiMock },
        { provide: MatDialog, useValue: matDialogMock },
      ],
    });

    service = TestBed.inject(PatientVideoCallNotifierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
