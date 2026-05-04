import { Component, Inject } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { VideoCallInviteDto } from '../services/video-calls-api.service';
import { buildJitsiMeetUrl } from './api.config';

@Component({
  selector: 'app-patient-video-call-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslateModule,
    TablerIconComponent,
  ],
  templateUrl: './patient-video-call-dialog.component.html',
  styleUrls: ['./patient-video-call-dialog.component.scss'],
})
export class PatientVideoCallDialogComponent {
  readonly bodyText: string;

  constructor(
    public dialogRef: MatDialogRef<
      PatientVideoCallDialogComponent,
      PatientVideoCallDialogResult
    >,
    @Inject(MAT_DIALOG_DATA) public data: VideoCallInviteDto,
    translate: TranslateService,
  ) {
    const doctor =
      data.physicianName?.trim() ||
      translate.instant('PATIENT_VIDEO_CALL_DOCTOR_FALLBACK');
    this.bodyText = translate.instant('PATIENT_VIDEO_CALL_BODY', {
      doctor,
    });
  }

  join(): void {
    const url = buildJitsiMeetUrl(this.data.roomName);
    const w = Math.min(960, window.screen.availWidth - 40);
    const h = Math.min(720, window.screen.availHeight - 80);
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(
      url,
      'patientVideoCall',
      `width=${w},height=${h},left=${left},top=${top},noopener,noreferrer`,
    );
    this.dialogRef.close({ action: 'joined' });
  }

  later(): void {
    this.dialogRef.close({ action: 'dismiss' });
  }
}

export type PatientVideoCallDialogResult = {
  action: 'joined' | 'dismiss';
};
