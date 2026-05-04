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

import {
  AuditorService,
  Auditor,
} from '../../../services/superadmin/auditor.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { AddAuditorDialog } from '../add-auditor/add-auditor';
import { EditAuditorDialog } from '../edit-auditor/edit-auditor';
import { ConfirmDialog } from './confirm-dialog';
import { CoreService } from 'src/app/services/core.service';

// ✅ Interface AuditorRow - isArchived REQUIRED
interface AuditorRow {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  isArchived: boolean; // ✅ Required
  isActive?: boolean; // ✅ Optional
}

@Component({
  selector: 'app-super-auditors',
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
  templateUrl: './auditors.html',
  styleUrls: ['./auditors.scss'],
})
export class AuditorsComponent implements OnInit, AfterViewInit {
  private dialog = inject(MatDialog);
  private auditorService = inject(AuditorService);
  private alertsService = inject(AlertsApiService);

  displayedColumns: string[] = ['photo', 'name', 'status', 'actions'];
  title = 'AUDITORS';
  dataSource = new MatTableDataSource<AuditorRow>([]);
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

  private auditorsData: Auditor[] = [];

  ngOnInit(): void {
    this.loadAuditors();
    this.loadAlerts();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  // ✅ Fonction de mapping explicite pour éviter les erreurs de type
  private mapToAuditorRow(a: Auditor): AuditorRow {
    return {
      _id: a._id,
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email,
      photo: a.photo,
      isArchived: Boolean(a.isArchived), // ✅ Conversion explicite en boolean
      isActive: Boolean(a.isActive ?? true),
    };
  }

  loadAuditors(): void {
    this.auditorService.getAuditors().subscribe({
      next: (data: Auditor[]) => {
        this.auditorsData = data;

        // ✅ Utiliser la fonction de mapping pour garantir les types
        this.dataSource.data = data.map((a) => this.mapToAuditorRow(a));
      },
      error: (err) => console.error('❌ Error loading auditors:', err),
    });
  }

  // ✅ LOAD ALERTS COUNT
  loadAlerts(): void {
    this.alertsService.getAlerts().subscribe({
      next: (alerts: any[]) => {
        this.alertCount = alerts.filter((a: any) => a.status === 'open').length;
      },
      error: (err: any) => console.error('❌ Error loading alerts:', err),
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  addAuditor(): void {
    const dialogRef = this.dialog.open(AddAuditorDialog, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadAuditors();
    });
  }

  editAuditor(auditor: AuditorRow): void {
    const fullAuditor = this.auditorsData.find((a) => a._id === auditor._id);

    const dialogRef = this.dialog.open(EditAuditorDialog, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: fullAuditor || auditor,
    });
    dialogRef.afterClosed().subscribe((res) => {
      if (res) this.loadAuditors();
    });
  }

  toggleStatus(auditor: AuditorRow): void {
    const action = auditor.isActive ? 'Deactivate' : 'Activate';

    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `${action} ${this.getFullName(auditor)}?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        const apiCall = auditor.isActive
          ? this.auditorService.deactivateAuditor(auditor._id)
          : this.auditorService.activateAuditor(auditor._id);

        apiCall.subscribe({
          next: () => this.loadAuditors(),
          error: (err) => alert('Error: ' + err.message),
        });
      }
    });
  }

  archiveAuditor(auditor: AuditorRow): void {
    const dialogRef = this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: { message: `Archive ${this.getFullName(auditor)} permanently?` },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.auditorService.archiveAuditor(auditor._id).subscribe({
          next: () => this.loadAuditors(),
          error: (err) => alert('Error: ' + err.message),
        });
      }
    });
  }

  getFullName(user: AuditorRow): string {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
  }

  getPhoto(photo?: string): string {
    return photo ? `${environment.apiUrl}/uploads/${photo}` : '';
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
