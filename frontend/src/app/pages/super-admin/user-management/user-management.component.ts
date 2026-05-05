import { environment } from 'src/environments/environment';
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UserManagementService, UserRow } from '../../../services/superadmin/user-management.service';
import { CoreService } from '../../../services/core.service';
import { UserFormDialog } from './user-form-dialog';
import { UserViewDialog } from './user-view-dialog';
import { ConfirmDialogComponent } from './confirm-dialog';

const ROLES = [
  { key: 'all',         label: 'All Users',    icon: 'users',                color: '#6c5ce7' },
  { key: 'patient',     label: 'Patients',     icon: 'heart-rate-monitor',   color: '#e17055' },
  { key: 'doctor',      label: 'Doctors',      icon: 'stethoscope',          color: '#0984e3' },
  { key: 'nurse',       label: 'Nurses',       icon: 'nurse',                color: '#00b894' },
  { key: 'coordinator', label: 'Coordinators', icon: 'users-group',          color: '#fdcb6e' },
  { key: 'auditor',     label: 'Auditors',     icon: 'eye',                  color: '#a29bfe' },
  { key: 'admin',       label: 'Admins',       icon: 'shield-lock',          color: '#2d3436' },
];

const ROLE_PERMISSION: Record<string, string> = {
  all:         'users:read',
  patient:     'patients:read',
  doctor:      'doctors:read',
  nurse:       'nurses:read',
  coordinator: 'coordinators:read',
  auditor:     'auditors:read',
  admin:       'users:read',
};

const CREATE_PERMISSION: Record<string, string> = {
  patient:     'patients:create',
  doctor:      'doctors:create',
  nurse:       'nurses:create',
  coordinator: 'coordinators:create',
  auditor:     'auditors:create',
  admin:       'users:create',
};

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MaterialModule,
    MatSortModule, MatPaginatorModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  roles = ROLES;
  selectedRole = 'all';
  loading = false;

  displayedColumns = ['photo', 'name', 'role', 'contact', 'status', 'actions'];
  dataSource = new MatTableDataSource<UserRow>([]);

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

  constructor(
    private svc: UserManagementService,
    public core: CoreService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void { this.load(); }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
    this.dataSource.filterPredicate = (row, filter) => {
      const s = filter.toLowerCase();
      return [row.firstName, row.lastName, row.email, row.phone].some(v => v?.toLowerCase().includes(s));
    };
  }

  selectRole(role: string): void {
    this.selectedRole = role;
    this.load();
  }

  load(): void {
    this.loading = true;
    const obs = this.selectedRole === 'all'
      ? this.svc.getAllUsers()
      : this.svc.getByRole(this.selectedRole);

    obs.subscribe({
      next: (data) => { this.dataSource.data = data; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  applyFilter(e: Event): void {
    this.dataSource.filter = (e.target as HTMLInputElement).value.trim();
    this.dataSource.paginator?.firstPage();
  }

  openAdd(): void {
    const role = this.selectedRole === 'all' ? 'patient' : this.selectedRole;
    this.dialog.open(UserFormDialog, {
      width: '700px', maxWidth: '95vw', maxHeight: '90vh',
      data: { role },
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openView(user: UserRow): void {
    this.dialog.open(UserViewDialog, {
      width: '500px', maxWidth: '95vw',
      data: user,
    });
  }

  openEdit(user: UserRow): void {
    const role = this.getRoleName(user);
    this.dialog.open(UserFormDialog, {
      width: '700px', maxWidth: '95vw', maxHeight: '90vh',
      data: { role, user },
    }).afterClosed().subscribe(r => { if (r) this.load(); });
  }

  toggleActive(user: UserRow): void {
    const isCurrentlyActive = user.isActive;
    const action = isCurrentlyActive ? 'Deactivate' : 'Activate';

    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      disableClose: false,
      data: {
        title: `${action} User`,
        message: `Are you sure you want to ${action.toLowerCase()} ${user.firstName} ${user.lastName}?`,
        confirmLabel: action,
        confirmColor: isCurrentlyActive ? 'warn' : 'primary',
      },
    }).afterClosed().subscribe((confirmed: any) => {
      if (confirmed !== true) return;

      const obs$ = isCurrentlyActive
        ? this.svc.deactivate(user._id)
        : this.svc.activate(user._id);

      obs$.subscribe({
        next: () => {
          this.snack.open(`User ${action.toLowerCase()}d successfully`, 'OK', { duration: 2500 });
          this.load();
        },
        error: (err) => {
          console.error(`${action} error:`, err);
          this.snack.open(`Failed to ${action.toLowerCase()} user`, 'OK', { duration: 3000 });
        },
      });
    });
  }

  archive(user: UserRow): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Archive User',
        message: `Archive ${user.firstName} ${user.lastName}? They will no longer be able to log in.`,
        confirmLabel: 'Archive',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.svc.archive(user._id).subscribe({
        next: () => { this.snack.open('User archived', 'OK', { duration: 2500 }); this.load(); },
        error: () => this.snack.open('Error archiving user', 'OK', { duration: 2500 }),
      });
    });
  }

  restore(user: UserRow): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: 'Restore User',
        message: `Restore ${user.firstName} ${user.lastName}?`,
        confirmLabel: 'Restore',
        confirmColor: 'primary',
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.svc.restore(user._id).subscribe({
        next: () => { this.snack.open('User restored', 'OK', { duration: 2500 }); this.load(); },
        error: () => this.snack.open('Error restoring user', 'OK', { duration: 2500 }),
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────

  canCreate(): boolean {
    if (this.selectedRole === 'all') return this.core.hasPermission('users:create');
    return this.core.hasPermission(CREATE_PERMISSION[this.selectedRole] ?? 'users:create');
  }

  canEdit(): boolean {
    const perms = this.core.getPermissions();
    if (perms.includes('*')) return true;
    return this.core.hasPermission('users:update')
      || this.core.hasPermission(`${this.selectedRole}s:update`)
      || this.core.hasPermission('patients:update')
      || this.core.hasPermission('doctors:update')
      || this.core.hasPermission('nurses:update')
      || this.core.hasPermission('coordinators:update')
      || this.core.hasPermission('auditors:update');
  }
  canDelete(): boolean { return this.core.hasPermission('users:delete') || this.core.hasPermission(`${this.selectedRole}s:delete`); }

  getRoleName(user: UserRow): string {
    const r = user.role;
    if (!r) return 'unknown';
    if (typeof r === 'string') return r.toLowerCase();
    return (r.name ?? 'unknown').toLowerCase();
  }

  getRoleColor(user: UserRow): string {
    const name = this.getRoleName(user);
    return ROLES.find(r => r.key === name)?.color ?? '#b2bec3';
  }

  getPhoto(user: UserRow): string {
    return user.photo ? `${environment.apiUrl}/uploads/${user.photo}` : '';
  }

  getInitials(user: UserRow): string {
    return ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?';
  }

  getExtraInfo(user: UserRow): string {
    const role = this.getRoleName(user);
    const svcName = user.serviceId?.name ?? '';

    if (role === 'doctor')      return [user.specialization, svcName].filter(Boolean).join(' · ');
    if (role === 'nurse')       return svcName;
    if (role === 'coordinator') return svcName;
    if (role === 'admin')       return svcName;
    if (role === 'patient')     return [user.medicalRecordNumber, svcName].filter(Boolean).join(' · ');
    if (role === 'auditor')     return '';
    return svcName;
  }

  get selectedRoleLabel(): string {
    return ROLES.find(r => r.key === this.selectedRole)?.label ?? 'Users';
  }

  get totalActive(): number   { return this.dataSource.data.filter(u => u.isActive && !u.isArchived).length; }
  get totalInactive(): number { return this.dataSource.data.filter(u => !u.isActive).length; }
  get totalArchived(): number { return this.dataSource.data.filter(u => u.isArchived).length; }
}
