import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PatientVideoCallDialogComponent } from './patient-video-call-dialog.component';

describe('PatientVideoCallDialogComponent', () => {
  let component: PatientVideoCallDialogComponent;
  let fixture: ComponentFixture<PatientVideoCallDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientVideoCallDialogComponent, TranslateModule.forRoot()],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: MAT_DIALOG_DATA, useValue: { roomName: 'test-room', physicianName: 'Dr. Test' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PatientVideoCallDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
