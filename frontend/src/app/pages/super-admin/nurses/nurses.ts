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
import { environment } from 'src/environments/environment';
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

import { AddNurse } from '../add-nurse/add-nurse';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { EditNurse } from '../edit-nurse/edit-nurse';
import { ConfirmDialog } from './confirm-dialog'; // ✅ Import ConfirmDialog
import { CoreService } from 'src/app/services/core.service';

interface NurseRow {
  _id: string;
  name: string;
  email: string;
  service: string;
  status: 'Active' | 'Inactive';
  photo?: string;
  isActive?: boolean;
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
    ConfirmDialog, // ✅ Ajouter ConfirmDialog aux imports
  ],
  templateUrl: './nurses.html',
  styleUrls: ['./nurses.scss'],
})
export class NursesComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private nurseService = inject(NurseService);
  constructor(
    public core: CoreService, //
  ) {}

  displayedColumns: string[] = [
    'photo',
    'name',
    'service',
    'status',
    'actions',
  ];
  title = 'NURSES';
  dataSource = new MatTableDataSource<NurseRow>([]);

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

  private nursesData: any[] = [];

  ngOnInit(): void {
    this.loadNurses();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadNurses(): void {
    console.log('📡 Chargement des nurses...');

    this.nurseService.getNurses().subscribe({
      next: (data: any[]) => {
        console.log('✅ Données reçues:', data);

        this.nursesData = data;

        this.dataSource.data = data.map((n: any) => {
          console.log(`📋 Nurse ${n.firstName} ${n.lastName}:`, {
            phone: n.phone,
            nationalId: n.nationalId,
            address: n.address,
            gender: n.gender,
            serviceId: n.serviceId,
            isActive: n.isActive,
          });

          return {
            _id: n._id || '',
            name:
              `${n.firstName || ''} ${n.lastName || ''}`.trim() || 'Unknown',
            email: n.email || '',
            service:
              typeof n.serviceId === 'object'
                ? (n.serviceId as any)?.name || 'N/A'
                : n.serviceId || n.service || 'N/A',
            status: n.isArchived ? 'Inactive' : 'Active',
            isActive: n.isActive ?? true,
            photo: n.photo ? `${environment.apiUrl}/uploads/${n.photo}` : '',
          };
        });
      },
      error: (err: any) => {
        console.error('❌ Erreur chargement nurses:', err);
      },
    });
  }

  editNurse(nurse: NurseRow): void {
    console.log('✏️ editNurse called with:', nurse);

    const fullNurse = this.nursesData.find((n) => n._id === nurse._id);

    console.log('🔍 fullNurse trouvé:', fullNurse);

    if (!fullNurse) {
      console.warn('⚠️ Nurse non trouvé, fetch depuis API...');
      this.nurseService.getNurseById(nurse._id).subscribe({
        next: (data) => {
          console.log('✅ Données API reçues:', data);
          this.openEditDialog(data);
        },
        error: (err) => {
          console.error('❌ Erreur chargement nurse:', err);
          alert('Erreur: Impossible de charger les données du nurse');
        },
      });
    } else {
      this.openEditDialog(fullNurse);
    }
  }

  private openEditDialog(nurseData: any): void {
    console.log('🎯 Opening dialog with data:', nurseData);

    const dialogRef = this.dialog.open(EditNurse, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: nurseData,
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'dialog-backdrop',
      panelClass: 'custom-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadNurses();
    });
  }

  // ✅ TOGGLE STATUS avec ConfirmDialog
  toggleStatus(nurse: NurseRow): void {
    const action = nurse.isActive ? 'Désactiver' : 'Activer';

    // Ouvrir le dialog de confirmation
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `${action} le compte de ${nurse.name} ?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        // Appel API selon l'action
        const apiCall = nurse.isActive
          ? this.nurseService.deactivateNurse(nurse._id)
          : this.nurseService.activateNurse(nurse._id);

        apiCall.subscribe({
          next: () => {
            console.log(`✅ Nurse ${nurse.isActive ? 'désactivé' : 'activé'}`);
            this.loadNurses();
          },
          error: (err) => {
            console.error('❌ Erreur toggle status:', err);
            alert(`Erreur lors de la ${action.toLowerCase()} du nurse`);
          },
        });
      }
      // Si annulé, ne rien faire
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  addUser(): void {
    const dialogRef = this.dialog.open(AddNurse, { width: '800px' });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadNurses();
    });
  }

  // ✅ Archive avec ConfirmDialog aussi
  archiveNurse(nurse: NurseRow): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Archiver définitivement ${nurse.name} ?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.nurseService.archiveNurse(nurse._id).subscribe({
          next: () => {
            console.log('✅ Nurse archivé');
            this.loadNurses();
          },
          error: (err: any) => {
            console.error('❌ Erreur archive:', err);
            alert("Erreur lors de l'archivage");
          },
        });
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}
