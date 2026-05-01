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

import { ConfirmDialog } from '../patients/confirm-dialog';
import { ServiceService } from 'src/app/services/superadmin/service.service';
import { AddServiceDialog } from '../add-service/add-service';
import { EditServiceComponent } from '../edit-service/edit-service';
import { ServiceViewDialog } from './service-view-dialog';

export interface ServiceModel {
  _id: string;
  name: string;
  code: string;
  description: string;
  isActive?: boolean;
}

@Component({
  selector: 'app-service',
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
  templateUrl: './service.html',
  styleUrls: ['./service.scss'],
})
export class ServiceComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private serviceService = inject(ServiceService);

  loading = false;

  displayedColumns: string[] = [
    'name',
    'code',
    'description',
    'status',
    'actions',
  ];

  dataSource = new MatTableDataSource<ServiceModel>([]);

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
    this.loadServices();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadServices(): void {
    this.loading = true;

    this.serviceService.getServices().subscribe({
      next: (data: ServiceModel[]) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      },
    });
  }

  applyFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dataSource.filter = value.trim().toLowerCase();
  }

  addService() {
    const dialogRef = this.dialog.open(AddServiceDialog, {
      width: '600px',
    });

    dialogRef.afterClosed().subscribe((formData) => {
      if (formData) {
        this.serviceService.createService(formData).subscribe(() => {
          this.loadServices();
        });
      }
    });
  }

  deleteService(service: ServiceModel): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Delete ${service.name}?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.serviceService.deleteService(service._id).subscribe(() => {
          this.loadServices();
        });
      }
    });
  }

  toggleStatus(service: ServiceModel): void {
    const action = service.isActive ? 'Deactivate' : 'Activate';

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `${action} ${service.name}?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      const request = service.isActive
        ? this.serviceService.deactivateService(service._id)
        : this.serviceService.activateService(service._id);

      request.subscribe(() => {
        this.loadServices();
      });
    });
  }

  viewService(service: ServiceModel): void {
    this.dialog.open(ServiceViewDialog, { width: '420px', data: service });
  }

  editService(service: ServiceModel): void {
    const dialogRef = this.dialog.open(EditServiceComponent, {
      width: '600px',
      data: service,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.serviceService.updateService(service._id, result).subscribe(() => {
          this.loadServices();
        });
      }
    });
  }
}
