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

import { AdminService } from '../../../services/superadmin/admin.service';
import {
  AddDoctorDialog as AddMedecinDialog,
  DoctorData,
} from '../../admin/add-medecin-dialog/add-medecin-dialog';

// ✅ Interface complète
interface AdminRow {
  _id: string;
  name: string;
  email: string;
  role: string;
  service: string;
  status: string;
  photo?: string;
}

@Component({
  selector: 'app-admin-users',
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
    TranslateModule,
  ],
  templateUrl: './admin-users.html',
  styleUrls: ['./admin-users.scss'],
})
export class AdminUsersComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private adminService = inject(AdminService);

  displayedColumns: string[] = [
    'photo',
    'name',
    'role',
    'service',
    'status',
    'actions',
  ];
  title = 'USERS';
  dataSource = new MatTableDataSource<AdminRow>([]);

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
    this.loadAdmins();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // ✅ LOAD ADMINS
  loadAdmins(): void {
    this.adminService.getAdmins().subscribe({
      next: (data: any[]) => {
        this.dataSource.data = data.map((admin: any) => ({
          _id: admin._id || '',
          name:
            `${admin.firstName || ''} ${admin.lastName || ''}`.trim() ||
            admin.name ||
            'Unknown',
          email: admin.email || '',
          role: admin.role || 'Staff',
          service: admin.service || admin.specialty || '-',
          status: admin.status || 'Active',
          photo: admin.photo
            ? `${environment.apiUrl}/uploads/${admin.photo}`
            : '',
        }));
      },
      error: (err) => console.error('Error loading admins:', err),
    });
  }

  // ✅ SEARCH
  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // ✅ ADD ADMIN - ✅ CORRECTION: data: {}
  addUser(): void {
    const dialogRef = this.dialog.open(AddMedecinDialog, {
      width: '600px',
      data: {}, // ✅ Clé "data:" ajoutée
    });

    dialogRef.afterClosed().subscribe((result: DoctorData | undefined) => {
      if (result) {
        this.loadAdmins();
      }
    });
  }

  // ✅ DELETE ADMIN
  /*deleteAdmin(admin: AdminRow): void {
    if (confirm(`Delete ${admin.name}?`)) {
      this.adminService.deleteAdmin?.(admin._id)?.subscribe({
        next: () => this.loadAdmins(),
        error: (err: any) => {
          console.error('Delete error:', err);
          this.dataSource.data = this.dataSource.data.filter(
            (a: AdminRow) => a._id !== admin._id,
          );
        },
      });
    }
  }*/

  // ✅ GET INITIALS FOR AVATAR
  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    return names.length >= 2
      ? (names[0][0] + names[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  // ✅ HANDLE IMAGE ERROR
  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  // ✅ ROLE BADGE CLASS
  getRoleClass(role: string): string {
    const roles: { [key: string]: string } = {
      SuperAdmin: 'role-superadmin',
      Admin: 'role-admin',
      Physician: 'role-physician',
      Nurse: 'role-nurse',
      Staff: 'role-staff',
    };
    return roles[role] || 'role-default';
  }

  // ✅ ROLE ICON
  getRoleIcon(role: string): string {
    const icons: { [key: string]: string } = {
      SuperAdmin: 'shield',
      Admin: 'admin_panel_settings',
      Physician: 'medical_services',
      Nurse: 'health_and_safety',
      Staff: 'person',
    };
    return icons[role] || 'person';
  }
}
