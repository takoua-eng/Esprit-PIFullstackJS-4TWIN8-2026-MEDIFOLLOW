?import { Component, OnInit, inject } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { CoordinatorService, CoordinatorPatientRow } from 'src/app/services/coordinator.service';
import { TranslateModule } from '@ngx-translate/core';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-coordinator-patients',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconComponent, TranslateModule],
  templateUrl: './coordinator-patients.html',
  styleUrls: ['./coordinator-patients.scss'],
})
export class CoordinatorPatientsComponent implements OnInit {
  private coordinatorService = inject(CoordinatorService);
  private coreService = inject(CoreService);

  coordinatorId = '';
  patients: CoordinatorPatientRow[] = [];
  loading = true;

  displayedColumns = ['name', 'email', 'department', 'medicalRecordNumber', 'vitals', 'symptoms', 'status'];

  ngOnInit(): void {
    // Lire l'ID depuis le JWT stocké dans localStorage
const token = localStorage.getItem('accessToken');
if (token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.coordinatorId = payload.sub || '';
  } catch { }
}

// Fallback sur CoreService
if (!this.coordinatorId) {
  const user = this.coreService.currentUser();
  this.coordinatorId = user?._id || '';
}

    if (!this.coordinatorId) { console.error('No coordinator ID'); this.loading = false; return; }

    this.coordinatorService.getPatientsWithCompliance(this.coordinatorId).subscribe({
      next: (data) => { this.patients = data; this.loading = false; },
      error: (err) => { console.error('Patients error', err); this.loading = false; },
    });
  }

  getStatusClass(status: string): string {
    if (status === 'UP_TO_DATE') return 'good';
    if (status === 'INCOMPLETE_TODAY') return 'warn';
    return 'neutral';
  }
}