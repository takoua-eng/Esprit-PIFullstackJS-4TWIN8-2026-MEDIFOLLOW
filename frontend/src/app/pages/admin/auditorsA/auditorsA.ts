import { environment } from 'src/environments/environment';
import { Component, inject, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSlideToggle } from '@angular/material/slide-toggle';

import { AuditorService, Auditor } from '../../../services/admin/auditor.service';
import { AddAuditorDialog, AuditorData } from '../../admin/add-auditor-dialog/add-auditor-dialog';
import { ConfirmDialogComponent } from 'src/app/components/confirm-dialog/confirm-dialog';
import { MatCard } from "@angular/material/card";
import { MaterialModule } from "src/app/material.module";
import { TranslateModule } from '@ngx-translate/core';

interface AuditorRow {
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
  selector: 'app-auditors-a',
  templateUrl: './auditorsA.html',
  styleUrls: ['./auditorsA.scss'],
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MatSlideToggle,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatCard,
    MaterialModule
],
})
export class AuditorsAComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private auditorService = inject(AuditorService);

  title = 'AUDITORS';
  displayedColumns: string[] = ['photo', 'name', 'email', 'status', 'actions'];
  dataSource = new MatTableDataSource<AuditorRow>([]);

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
    this.loadAuditors();

    this.dataSource.filterPredicate = (data: AuditorRow, filter: string): boolean => {
      const filterValue = filter.toLowerCase();
      return (`${data.firstName} ${data.lastName}`.toLowerCase().includes(filterValue) || 
              (data.email ?? '').toLowerCase().includes(filterValue));
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadAuditors(): void {
    this.auditorService.getAuditors().subscribe({
      next: (data: Auditor[]) => {
        this.dataSource.data = data.map(a => ({
          _id: a._id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          phone: a.phone,
          photo: a.photo ? `${environment.apiUrl}/uploads/${a.photo}` : '',
          isActive: a.isActive ?? true,
          isArchived: a.isArchived ?? false,
        }));
      },
      error: err => console.error(err),
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) this.dataSource.paginator.firstPage();
  }

  addAuditor(): void {
    const dialogRef = this.dialog.open(AddAuditorDialog, { width: '95vw', maxWidth: '1200px', data: {} });
    dialogRef.afterClosed().subscribe((result: AuditorData | undefined) => {
      if (result) this.loadAuditors();
    });
  }

  editAuditor(row: AuditorRow): void {
    this.auditorService.getAuditorById(row._id).subscribe({
      next: auditor => {
        const dialogRef = this.dialog.open(AddAuditorDialog, { width: '95vw', maxWidth: '1200px', data: { auditor } });
        dialogRef.afterClosed().subscribe(res => { if (res) this.loadAuditors(); });
      },
      error: err => alert('Impossible de récupérer les informations de l’auditor.'),
    });
  }

  toggleStatus(row: AuditorRow): void {
    const action = row.isActive ? 'Désactiver' : 'Activer';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, { width: '400px', data: { message: `${action} le compte de ${row.firstName} ${row.lastName} ?` } });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      const apiCall = row.isActive ? this.auditorService.archiveAuditor(row._id) : this.auditorService.activateAuditor(row._id);
      apiCall.subscribe({ next: () => this.loadAuditors(), error: err => alert(`Erreur ${action}`) });
    });
  }

  getFullName(row: AuditorRow): string { return `${row.firstName} ${row.lastName}`; }
  getFirstName(row: AuditorRow): string { return row.firstName; }
  getLastName(row: AuditorRow): string { return row.lastName; }
  getPhoto(photo: string): string { return `${environment.apiUrl}/uploads/${photo}`; }
  getInitials(firstName?: string, lastName?: string): string {
    const first = firstName?.charAt(0) ?? '';
    const last = lastName?.charAt(0) ?? '';
    return (first + last).toUpperCase() || '?';
  }

  onImageError(event: any): void { event.target.style.display = 'none'; }
}