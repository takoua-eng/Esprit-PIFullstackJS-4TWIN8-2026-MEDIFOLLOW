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

import { AddPatientDialog } from '../add-patient-dialog/add-patient-dialog';
import {
  PatientService,
  Patient,
} from 'src/app/services/superadmin/patient.service';
import { ConfirmDialog } from './confirm-dialog';
import { CoreService } from 'src/app/services/core.service';

interface PatientRow {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  photo: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-super-patients',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    MatDialogModule,
    ConfirmDialog,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './patients.html',
  styleUrls: ['./patients.scss'],
})
export class Patients implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private patientService = inject(PatientService);
  constructor(
    public core: CoreService, //
  ) {}

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

  ngOnInit() {
    this.loadPatients();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadPatients() {
    this.loading = true;
    this.patientService.getPatients().subscribe({
      next: (data: Patient[]) => {
        console.log('DATA FROM BACKEND:', data);
        this.dataSource.data = data.map((p) => ({
          _id: p._id,
          name: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email || '',
          phone: p.phone || '-',
          gender: p.gender || 'N/A',
          isActive: p.isActive ?? true,
          photo: p.photo ? `http://localhost:3000/uploads/${p.photo}` : '',
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  addUser() {
    const dialogRef = this.dialog.open(AddPatientDialog, { width: '600px' });
    dialogRef.afterClosed().subscribe((formData) => {
      if (formData) {
        this.patientService.createPatient(formData).subscribe(() => {
          this.loadPatients();
        });
      }
    });
  }

  deletePatient(user: PatientRow) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Archive ${user.name}?` },
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.patientService.archivePatient(user._id).subscribe(() => {
          this.loadPatients();
        });
      }
    });
  }

  toggleStatus(user: PatientRow) {
    const action = user.isActive ? 'Deactivate' : 'Activate';
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `${action} ${user.name}?` },
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        if (user.isActive) {
          this.patientService.deactivatePatient(user._id).subscribe(() => {
            this.loadPatients();
          });
        } else {
          this.patientService.activatePatient(user._id).subscribe(() => {
            this.loadPatients();
          });
        }
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  onImageError(event: any) {
    event.target.style.display = 'none';
  }
}
