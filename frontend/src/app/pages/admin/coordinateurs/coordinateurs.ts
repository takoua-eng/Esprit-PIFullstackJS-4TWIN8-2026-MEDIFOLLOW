import { environment } from 'src/environments/environment';
import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
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

import { CoordinateurService, Coordinator } from './../../../services/superadmin/coordinateur.service';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog';
import { AddCoordinatorDialog, CoordinatorData } from 'src/app/pages/admin/add-coordinateur-dialog/add-coordinateur-dialog';

interface CoordinatorRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Component({
  selector: 'app-coordinateurs',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatSnackBarModule,
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
  templateUrl: './coordinateurs.html',
  styleUrls: ['./coordinateurs.scss'],
})
export class CoordinateursComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private coordService = inject(CoordinateurService);
  private snackBar = inject(MatSnackBar);

  title = 'COORDINATORS';
  displayedColumns: string[] = ['photo', 'name', 'phone', 'status', 'actions'];
  dataSource = new MatTableDataSource<CoordinatorRow>([]);

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

  ngOnInit(): void {
    this.loadCoordinators();

    // 🔍 Search filter
    this.dataSource.filterPredicate = (data: CoordinatorRow, filter: string): boolean => {
      const nameMatch = ((data.firstName ?? '') + ' ' + (data.lastName ?? '')).toLowerCase().includes(filter);
      const emailMatch = (data.email ?? '').toLowerCase().includes(filter);
      return nameMatch || emailMatch;
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // ✅ Load coordinators
  loadCoordinators(): void {
    this.coordService.getCoordinators().subscribe({
      next: (coords) => {
        this.dataSource.data = coords
          .filter(c => !c.isArchived)
          .map(c => ({
            ...c,
            photo: c.photo ? `http://localhost:3000/uploads/${c.photo}` : '',
            isActive: c.isActive ?? true,
            isArchived: c.isArchived ?? false,
          }));

        this.dataSource.sort = this.sort;
        this.dataSource.paginator = this.paginator;
      },
      error: (err) => console.error('Erreur coordinators:', err),
    });
  }

  // ✅ Search
  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  // ✅ Add coordinator
  addCoordinator(): void {
    const dialogRef = this.dialog.open(AddCoordinatorDialog, {
      width: '95vw',
      maxWidth: '1200px',
      height: '95vh',
      data: {},
    });

    dialogRef.afterClosed().subscribe((result: CoordinatorData | undefined) => {
      if (result) this.loadCoordinators();
    });
  }

  // ✅ Edit coordinator
  editCoordinator(row: CoordinatorRow): void {
    this.coordService.getCoordinatorById(row._id).subscribe({
      next: (coord) => {
        const dialogRef = this.dialog.open(AddCoordinatorDialog, {
          width: '95vw',
          maxWidth: '1200px',
          data: { coordinator: coord },
        });

        dialogRef.afterClosed().subscribe(res => {
          if (res) this.loadCoordinators();
        });
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Impossible de récupérer le coordinateur', 'Fermer', { duration: 3000 });
      },
    });
  }

  // ✅ Archive coordinator
  archiveCoordinator(coord: CoordinatorRow): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Archiver coordinateur',
        message: `Voulez-vous archiver ${coord.firstName} ${coord.lastName} ?`,
      },
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coordService.archiveCoordinator(coord._id).subscribe({
          next: () => {
            this.snackBar.open('Archivé avec succès', 'Fermer', { duration: 3000 });
            this.loadCoordinators();
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open('Erreur archivage', 'Fermer', { duration: 3000 });
          },
        });
      }
    });
  }

  // ✅ Toggle active status
  toggleStatus(row: CoordinatorRow): void {
    if (!row._id) return;
    if (row.isActive) {
      this.coordService.deactivateCoordinator(row._id).subscribe({
        next: () => row.isActive = false,
        error: (err) => this.snackBar.open('Erreur désactivation', 'Fermer', { duration: 3000 }),
      });
    } else {
      this.coordService.activateCoordinator(row._id).subscribe({
        next: () => row.isActive = true,
        error: (err) => this.snackBar.open('Erreur activation', 'Fermer', { duration: 3000 }),
      });
    }
  }

  // ✅ Utils
  getInitials(first?: string, last?: string): string {
    return ((first?.charAt(0) || '') + (last?.charAt(0) || '')).toUpperCase() || '?';
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}
