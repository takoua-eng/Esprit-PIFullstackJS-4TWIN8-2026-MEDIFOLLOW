import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { RoleService } from 'src/app/services/superadmin/role.service';
import { ConfirmDialog } from '../patients/confirm-dialog';
import { AddRoleComponent } from '../add-role/add-role';
import { RoleViewDialog } from './role-view-dialog';

interface RoleRow {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
  isArchived?: boolean;
  usersCount?: number; // ✅ جديد
}

@Component({
  selector: 'app-role',
  standalone: true,
  imports: [CommonModule, MaterialModule, ConfirmDialog, AddRoleComponent],
  templateUrl: './role.html',
  styleUrls: ['./role.scss'],
})
export class RoleComponent implements OnInit, AfterViewInit {
  private roleService = inject(RoleService);
  private dialog = inject(MatDialog);

  loading = false;

  displayedColumns: string[] = [
    'name',
    'description',
    'usersCount', // ✅ جديد
    'actions',
  ];

  dataSource = new MatTableDataSource<RoleRow>([]);

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
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // ✅ نحمل roles + stats ونربطهم
  loadData() {
    this.loading = true;

    // جلب roles
    this.roleService.getRoles().subscribe({
      next: (roles) => {
        // جلب stats
        this.roleService.getUsersCountByRole().subscribe({
          next: (stats) => {
            this.dataSource.data = roles
              .filter(r => !r.isArchived)
              .map((r) => {
              const stat = stats.find((s: any) => s.role === r.name);

              return {
                _id: r._id,
                name: r.name,
                description: r.description,
                permissions: r.permissions || [],
                isArchived: r.isArchived,
                usersCount: stat ? stat.count : 0, // ✅ الربط
              };
            });

            this.loading = false;
          },
          error: () => (this.loading = false),
        });
      },
      error: () => (this.loading = false),
    });
  }

  applyFilter(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  viewRole(role: RoleRow): void {
    this.dialog.open(RoleViewDialog, { width: '480px', data: role });
  }

  archiveRole(role: RoleRow) {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Archive role "${role.name}"? It will be hidden from the list.` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.roleService.archiveRole(role._id).subscribe({
          next: () => this.loadData(),
          error: (err) => console.error('Archive failed:', err),
        });
      }
    });
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(AddRoleComponent, { width: '500px' });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.roleService.createRole(result).subscribe(() => {
          this.loadData();
        });
      }
    });
  }

  openEditDialog(role: RoleRow) {
    const dialogRef = this.dialog.open(AddRoleComponent, {
      width: '500px',
      data: role,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.roleService.updateRole(role._id, result).subscribe(() => {
          this.loadData();
        });
      }
    });
  }
}