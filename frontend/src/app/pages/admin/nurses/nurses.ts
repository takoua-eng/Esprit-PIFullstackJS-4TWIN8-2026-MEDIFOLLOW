import { environment } from '../../environments/environment';
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

import { NurseService } from 'src/app/services/admin/nurse.service';
import { ServiceService } from 'src/app/services/admin/service.service';

import { AddNurse } from 'src/app/pages/admin/add-nurse-dialog/add-nurse-dialog';
import { EditNurse } from 'src/app/pages/super-admin/edit-nurse/edit-nurse';
import { ConfirmDialog } from 'src/app/pages/admin/nurses/confirm-dialog';
import { CoreService } from 'src/app/services/core.service';

export interface NurseRow {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender?: string;
  serviceId?: string;  // L’ObjectId côté base
  service?: {          // L’objet complet après populate
    _id: string;
    name: string;
    description?: string;
  };
  photo?: string;
  isActive?: boolean;
  isArchived?: boolean;
}

@Component({
  selector: 'app-super-nurses',
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
    ConfirmDialog,
  ],
  templateUrl: './nurses.html',
  styleUrls: ['./nurses.scss'],
})
export class NursesComponent implements OnInit, AfterViewInit {

  private dialog = inject(MatDialog);
  private nurseService = inject(NurseService);
  private serviceService = inject(ServiceService);

  constructor(public core: CoreService) { }

  title = 'NURSES';

  displayedColumns: string[] = [
    'photo',
    'name',
    'service',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<NurseRow>([]);
  private nursesData: any[] = [];
  private services: any[] = [];

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
    this.serviceService.getServices().subscribe({
      next: (services) => {
        this.services = services;
        this.loadNurses(); // on charge les nurses après avoir chargé les services
      },
      error: (err) => console.error('Erreur chargement services:', err),
    });

    // Filtrage sur name, email et service
    this.dataSource.filterPredicate = (data: NurseRow, filter: string): boolean => {
      const filterValue = filter.toLowerCase();
      return (
        (data.firstName ?? '').toLowerCase().includes(filterValue) ||
        (data.lastName ?? '').toLowerCase().includes(filterValue) ||
        (data.email ?? '').toLowerCase().includes(filterValue) ||
        (data.service?.name ?? '').toLowerCase().includes(filterValue)
      );
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  /** Load services */
  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (data: any[]) => this.services = data,
      error: (err) => console.error('Erreur chargement services:', err),
    });
  }

  /** Load nurses */
  loadNurses(): void {
    this.nurseService.getNurses().subscribe({
      next: (data: any[]) => {
        this.nursesData = data;

        this.dataSource.data = data
          .filter(n => !n.isArchived)
          .map(n => ({
            _id: n._id || '',
            firstName: n.firstName || '',
            lastName: n.lastName || ''
            ,
            email: n.email || '',
            service: this.services.find(s => s._id === n.serviceId) || { _id: '', name: '-' },
            isActive: n.isActive ?? true,
            isArchived: n.isArchived ?? false,
            photo: n.photo ? `${environment.apiUrl}/uploads/${n.photo}` : '',
          }));
      },
      error: (err) => console.error('Erreur chargement nurses:', err),
    });
  }

  /** Filtrage */
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /** Ajouter infirmière */
  addNurse(): void {
    const dialogRef = this.dialog.open(AddNurse, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadNurses();
    });
  }

  /** Modifier infirmière */
  editNurse(nurse: NurseRow): void {
    const fullNurse = this.nursesData.find(n => n._id === nurse._id);

    if (fullNurse) {
      this.openEditDialog(fullNurse);
    } else {
      this.nurseService.getNurseById(nurse._id).subscribe({
        next: data => this.openEditDialog(data),
        error: () => alert('Erreur chargement nurse'),
      });
    }
  }

  private openEditDialog(nurseData: any): void {
    const dialogRef = this.dialog.open(EditNurse, {
      width: '800px',
      data: nurseData,
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.loadNurses();
    });
  }

  /** Activer / Désactiver */
  toggleStatus(nurse: NurseRow): void {
    const action = nurse.isActive ? 'Désactiver' : 'Activer';
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `${action} le compte de ${nurse.firstName} ${nurse.lastName} ?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const apiCall = nurse.isActive
        ? this.nurseService.deactivateNurse(nurse._id)
        : this.nurseService.activateNurse(nurse._id);

      apiCall.subscribe({
        next: () => this.loadNurses(),
        error: () => alert(`Erreur ${action}`),
      });
    });
  }

  /** Archiver infirmière */
  archiveNurse(nurse: NurseRow): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Archiver ${nurse.firstName} ${nurse.lastName} ?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.nurseService.archiveNurse(nurse._id).subscribe({
        next: () => this.loadNurses(),
        error: () => alert("Erreur archivage"),
      });
    });
  }

  getServiceName(service: any): string {
    return service?.name || '-';
  }

  /** Initiales avatar */
getInitials(name: string): string { if (!name) return '?'; const names = name.split(' '); if (names.length >= 2) return (names[0][0] + names[1][0]).toUpperCase(); return name.substring(0, 2).toUpperCase(); }
  /** Cacher image cassée */
  onImageError(event: any): void { event.target.style.display = 'none'; }

  /**
 * Retourne le nom du service à partir de son ID
 * @param serviceId - L'ID du service (ObjectId côté backend)
 * @returns Le nom du service ou '-' si non trouvé
 */
  getServiceNameById(serviceId: string | undefined): string {
    if (!serviceId) return '-';

    // Cherche dans la liste des services déjà chargés
    const service = this.services.find(s => s._id === serviceId);

    // Retourne le nom ou '-' si non trouvé
    return service?.name || '-';
  }
}
