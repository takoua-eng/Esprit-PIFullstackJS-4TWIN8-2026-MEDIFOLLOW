import { environment } from 'src/environments/environment';
import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { DoctorService, Doctor } from 'src/app/services/admin/doctor.service';
import {
  AddDoctorDialog,
  DoctorData,
} from 'src/app/pages/admin/add-medecin-dialog/add-medecin-dialog';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog';

interface DoctorRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  specialty?: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Component({
  selector: 'app-medecins',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    TranslateModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  templateUrl: './medecins.html',
  styleUrls: ['./medecins.scss'],
})
export class MedecinsComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private doctorService = inject(DoctorService);

  title = 'DOCTORS';

  displayedColumns: string[] = [
    'photo',
    'name',
    'phone',
    'gender',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<DoctorRow>([]);

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
  this.loadDoctors();

  /** Improve search filter */
  this.dataSource.filterPredicate = (data: DoctorRow, filter: string): boolean => {
    const nameMatch =
      ((data.firstName ?? '') + ' ' + (data.lastName ?? '')).toLowerCase().includes(filter);
    const emailMatch = (data.email ?? '').toLowerCase().includes(filter);
    const specialtyMatch = (data.specialty ?? '').toLowerCase().includes(filter);

    return nameMatch || emailMatch || specialtyMatch;
  };
}

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /** Load doctors from API */
/** Load doctors from API */
  loadDoctors(): void {
    this.doctorService.getDoctors().subscribe({
      next: (doctors) => {
        // Filtrer les docteurs archivés
        this.dataSource.data = doctors
          .filter(d => !d.isArchived)
          .map(d => ({
            ...d,
            photo: d.photo ? `http://localhost:3000/uploads/${d.photo}` : '',
            isActive: d.isActive ?? true,
            isArchived: d.isArchived ?? false,
          }));
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
      },
      error: (err) => console.error('Erreur récupération doctor:', err)
    });
  }

  /** Search */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /** Add doctor dialog */
  addDoctor(): void {
    const dialogRef = this.dialog.open(AddDoctorDialog, {
      width: '95vw',
      maxWidth: '1200px',
      height: '95vh',
      maxHeight: '900px',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'dialog-backdrop',
      panelClass: 'custom-dialog-panel',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: DoctorData | undefined) => {
      if (result) {
        this.loadDoctors();
      }
    });
  }

  /** Archive doctor */
archiveDoctor(doctor: Doctor): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '400px',
    data: {
      title: 'Archiver docteur',
      message: `Êtes-vous sûr de vouloir archiver ${doctor.firstName} ${doctor.lastName} ?`
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.doctorService.archiveDoctor(doctor._id!).subscribe({
        next: () => {
          this.snackBar.open('Docteur archivé avec succès', 'Fermer', { duration: 3000 });
          this.loadDoctors(); // recharge la liste
        },
        error: (err) => {
          console.error('Erreur archivage doctor:', err);
          this.snackBar.open('Erreur lors de l’archivage', 'Fermer', { duration: 3000 });
        }
      });
    }
  });
}
  /** Avatar initials */
  getInitials(firstName?: string, lastName?: string): string {
    const first = firstName ? firstName.charAt(0) : '';
    const last = lastName ? lastName.charAt(0) : '';
    return (first + last).toUpperCase() || '?';
  }

  /** Toggle active/inactive status */
  toggleStatus(row: DoctorRow): void {
    if (!row._id) return;

    if (row.isActive) {
      this.doctorService.archiveDoctor(row._id).subscribe({
        next: () => (row.isActive = false),
        error: (err: any) => console.error(err),
      });
    } else {
      this.doctorService.activateDoctor(row._id).subscribe({
        next: () => (row.isActive = true),
        error: (err: any) => console.error(err),
      });
    }
  }

  /** Hide broken images */
  onImageError(event: any): void {
    event.target.style.display = 'none';
  }


  /** Edit doctor dialog */
editDoctor(row: DoctorRow) {
  this.doctorService.getDoctorById(row._id).subscribe({
    next: (doctor) => {
      const dialogRef = this.dialog.open(AddDoctorDialog, {
        width: '95vw',
        maxWidth: '1200px',
        data: { doctor },
      });

      dialogRef.afterClosed().subscribe((res) => {
        if (res) this.loadDoctors();
      });
    },
    error: (err) => {
      console.error('Erreur récupération doctor: ', err);
      alert('Impossible de récupérer les informations du doctor.');
    },
  });
}
}