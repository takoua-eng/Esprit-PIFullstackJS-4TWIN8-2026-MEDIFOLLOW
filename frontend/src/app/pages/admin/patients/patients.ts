import { environment } from 'src/environments/environment';
import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';

import { AddPatientDialog } from '../add-patient-dialog/add-patient-dialog';
import {
  PatientService,
  Patient,
} from 'src/app/services/superadmin/patient.service';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog';

interface PatientRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  photo: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    MatDialogModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './patients.html',
  styleUrls: ['./patients.scss'],
})
export class Patients implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private patientService = inject(PatientService);

  loading = false;

  displayedColumns: string[] = [
    'photo',
    'name',
    'phone',
    'gender',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<PatientRow>([]);

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if(ms) {
      this.sort = ms;
      this.dataSource.sort = this.sort;
    }
  }
  sort!: MatSort;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if(mp) {
      this.paginator = mp;
      this.dataSource.paginator = this.paginator;
    }
  }
  paginator!: MatPaginator;

  snackBar: any;

  ngOnInit(): void {
    this.loadPatients();

    // Filtre global amélioré
    this.dataSource.filterPredicate = (data: PatientRow, filter: string): boolean => {
      const nameMatch =
        ((data.firstName ?? '') + ' ' + (data.lastName ?? '')).toLowerCase().includes(filter);
      const phoneMatch = (data.phone ?? '').toLowerCase().includes(filter);
      const genderMatch = (data.gender ?? '').toLowerCase().includes(filter);

      return nameMatch || phoneMatch || genderMatch;
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // =============================
  // LOAD ALL PATIENTS
  // =============================

  loadPatients(): void {
    this.loading = true;

    this.patientService.getPatients().subscribe({
      next: (patients: Patient[]) => {
        this.dataSource.data = patients
          .filter(p => !p.isArchived)
          .map(p => ({
            _id: p._id,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || '',
            phone: p.phone || '-',
            gender: p.gender || 'N/A',
            isActive: p.isActive ?? true,
            isArchived: p.isArchived ?? false,
            photo: p.photo ? `http://localhost:3000/uploads/${p.photo}` : '',
          }));

        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading patients:', err);
        this.loading = false;
      },
    });
  }

  // =============================
  // FILTER
  // =============================

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // =============================
  // ADD PATIENT
  // =============================

  addUser(): void {
    const dialogRef = this.dialog.open(AddPatientDialog, { width: '600px' });

    dialogRef.afterClosed().subscribe((formData) => {
      if (formData) {
        this.patientService.createPatient(formData).subscribe(() => {
          this.loadPatients();
        });
      }
    });
  }

  // =============================
  // ARCHIVE PATIENT
  // =============================

  deletePatient(patient: PatientRow): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Archiver patient',
        message: `Êtes-vous sûr de vouloir archiver ${patient.firstName} ${patient.lastName} ?`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.patientService.archivePatient(patient._id).subscribe({
          next: () => {
            this.snackBar.open('Patient archivé avec succès', 'Fermer', { duration: 3000 });
            this.loadPatients();
          },
          error: (err) => {
            console.error('Erreur archivage patient:', err);
            this.snackBar.open("Erreur lors de l'archivage", 'Fermer', { duration: 3000 });
          },
        });
      }
    });
  }

  // =============================
  // ACTIVATE / DEACTIVATE
  // =============================

  toggleStatus(row: PatientRow): void {
    if (!row._id) return;

    if (row.isActive) {
      this.patientService.deactivatePatient(row._id).subscribe({
        next: () => (row.isActive = false),
        error: (err: any) => console.error(err),
      });
    } else {
      this.patientService.activatePatient(row._id).subscribe({
        next: () => (row.isActive = true),
        error: (err: any) => console.error(err),
      });
    }
  }

  // =============================
  // AVATAR
  // =============================

  getInitials(firstName?: string, lastName?: string): string {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase() || '?';
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }


  /** Edit patient dialog */
  editPatient(row: PatientRow) {
    this.patientService.getPatientById(row._id).subscribe({
      next: (patient) => {
        const dialogRef = this.dialog.open(AddPatientDialog, {
          width: '95vw',
          maxWidth: '1200px',
          data: { patient },
        });

        dialogRef.afterClosed().subscribe((res) => {
          if (res) this.loadPatients();
        });
      },
      error: (err) => {
        console.error('Erreur récupération patient: ', err);
        alert('Impossible de récupérer les informations du patient.');
      },
    });
  }


}

