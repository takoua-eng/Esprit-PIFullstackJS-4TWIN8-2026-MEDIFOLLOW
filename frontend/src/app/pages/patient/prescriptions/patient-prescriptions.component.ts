import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';
import { PrescriptionsApiService, PrescriptionDto } from 'src/app/services/prescriptions-api.service';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
  ],
  templateUrl: './patient-prescriptions.component.html',
  styleUrls: ['./patient-prescriptions.component.scss'],
})
export class PatientPrescriptionsComponent implements OnInit {
  prescriptions: PrescriptionDto[] = [];
  loading = true;

  constructor(
    private readonly prescriptionsApi: PrescriptionsApiService,
    private readonly core: CoreService
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    const user = this.core.currentUser();
    if (!user?._id) return;

    this.loading = true;
    this.prescriptionsApi.getPatientPrescriptions(user._id).subscribe({
      next: (data) => {
        this.prescriptions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load prescriptions', err);
        this.loading = false;
      }
    });
  }
}
