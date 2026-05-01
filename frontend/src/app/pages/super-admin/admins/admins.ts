import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  Inject, // ✅ Ajouter cet import
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogContent,
  MatDialogActions,
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule, MatIcon } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import {
  AdminService,
  Admin,
} from '../../../services/superadmin/admin.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { AddAdminDialog } from '../add-admin/add-admin';
import { EditAdminDialog } from '../edit-admin/edit-admin';
import { CoreService } from 'src/app/services/core.service';

// === ✅ CONFIRMATION DIALOG COMPONENT (CORRIGÉ) ===
@Component({
  standalone: true,
  template: `
    <div class="confirm-dialog">
      <h2 mat-dialog-title>
        <mat-icon color="warn">warning</mat-icon>
        Confirmation
      </h2>
      <mat-dialog-content>
        <p>{{ data.message }}</p>
        <p
          class="action-text"
          [class.activate]="data.action === 'activate'"
          [class.deactivate]="data.action === 'deactivate'"
        >
          <strong>
            {{ data.action === 'activate' ? 'Activer' : 'Désactiver' }}
            le compte de {{ data.adminName }} ?
          </strong>
        </p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Annuler</button>
        <button mat-raised-button color="warn" (click)="onConfirm()">
          Confirmer
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .confirm-dialog {
        min-width: 400px;
      }
      h2 {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0;
      }
      .action-text {
        margin-top: 16px;
        padding: 12px;
        border-radius: 8px;
        background: #f5f5f5;
      }
      .action-text.activate {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .action-text.deactivate {
        background: #fff3e0;
        color: #ef6c00;
      }
      mat-dialog-actions {
        gap: 8px;
      }
    `,
  ],
  imports: [MatIcon, MatDialogContent, MatDialogActions],
})
export class ConfirmToggleDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmToggleDialog>,
    @Inject(MAT_DIALOG_DATA) // ✅ CORRECTION ICI
    public data: {
      message: string;
      adminName: string;
      action: 'activate' | 'deactivate';
    },
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

// === MAIN COMPONENT ===
interface AdminRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  photo?: string;
  isArchived: boolean;
  isActive: boolean;
}

@Component({
  selector: 'app-admins-list',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ConfirmToggleDialog, // ✅ Composant standalone importé correctement
  ],
  templateUrl: './admins.html',
  styleUrls: ['./admins.scss'],
})
export class AdminsComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private adminService = inject(AdminService);
  private alertsService = inject(AlertsApiService);

  displayedColumns: string[] = [
    'photo',
    'name',
    'phone',
    'gender',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<AdminRow>([]);
  alertCount = 0;

  constructor(
    public core: CoreService, //
  ) {}
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

  private adminsData: Admin[] = [];

  ngOnInit(): void {
    this.loadAdmins();
    this.loadAlerts();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    this.dataSource.filterPredicate = (data: AdminRow, filter: string) => {
      const full =
        `${data.firstName} ${data.lastName} ${data.email} ${data.phone}`.toLowerCase();
      return full.includes(filter);
    };
  }

  private mapToAdminRow(a: Admin): AdminRow {
    return {
      _id: a._id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      phone: a.phone || '-',
      gender: a.gender || 'N/A',
      photo: a.photo ? `http://localhost:3000/uploads/${a.photo}` : '',
      isArchived: Boolean(a.isArchived),
      isActive: Boolean(a.isActive ?? true),
    };
  }

  loadAdmins(): void {
    this.adminService.getAdmins().subscribe({
      next: (data: Admin[]) => {
        this.adminsData = data;
        const filtered = data.filter((a) => !a.isArchived);
        this.dataSource.data = filtered.map((a) => this.mapToAdminRow(a));
      },
      error: (err) => console.error('Error loading admins:', err),
    });
  }

  loadAlerts(): void {
    this.alertsService.getAlerts().subscribe({
      next: (alerts: any[]) => {
        this.alertCount = alerts.filter((a) => a.status === 'open').length;
      },
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  addAdmin(): void {
    const dialogRef = this.dialog.open(AddAdminDialog, {
      width: '500px',
      disableClose: false,
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadAdmins();
    });
  }

  editAdmin(admin: AdminRow): void {
    const fullAdmin = this.adminsData.find((a) => a._id === admin._id);
    const dialogRef = this.dialog.open(EditAdminDialog, {
      width: '500px',
      data: fullAdmin,
      disableClose: false,
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadAdmins();
    });
  }

  // === TOGGLE STATUS WITH CONFIRMATION ===
  async toggleStatus(admin: AdminRow): Promise<void> {
    const action = admin.isActive ? 'deactivate' : 'activate';
    const adminName = this.getFullName(admin);

    const dialogRef = this.dialog.open(ConfirmToggleDialog, {
      width: '450px',
      disableClose: true,
      data: {
        message: admin.isActive
          ? "Vous êtes sur le point de désactiver ce compte. L'admin ne pourra plus se connecter."
          : "Vous êtes sur le point d'activer ce compte. L'admin pourra se connecter.",
        adminName: adminName,
        action: action,
      },
    });

    const result = await dialogRef.afterClosed().toPromise();

    if (result === true) {
      const api = admin.isActive
        ? this.adminService.deactivateAdmin(admin._id)
        : this.adminService.activateAdmin(admin._id);

      api.subscribe({
        next: () => {
          this.loadAdmins();
          console.log(
            `Compte ${action === 'activate' ? 'activé' : 'désactivé'} avec succès`,
          );
        },
        error: (err) => {
          console.error('Error toggling status:', err);
        },
      });
    }
  }

  archiveAdmin(admin: AdminRow): void {
    const dialogRef = this.dialog.open(ConfirmToggleDialog, {
      width: '450px',
      disableClose: true,
      data: {
        message:
          'Attention: Cette action est irréversible. Toutes les données de cet admin seront archivées.',
        adminName: this.getFullName(admin),
        action: 'deactivate',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.adminService.archiveAdmin(admin._id).subscribe({
          next: () => this.loadAdmins(),
          error: (err) => console.error('Error archiving admin:', err),
        });
      }
    });
  }

  getFullName(u: AdminRow): string {
    return `${u.firstName} ${u.lastName}`;
  }

  getPhoto(photo?: string): string {
    return photo ? `http://localhost:3000/uploads/${photo}` : '';
  }

  getInitials(name: string): string {
    const parts = name.split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }
}
