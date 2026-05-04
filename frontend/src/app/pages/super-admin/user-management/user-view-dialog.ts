import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { UserRow } from '../../../services/superadmin/user-management.service';

const ROLE_COLORS: Record<string, string> = {
  patient: '#e17055', doctor: '#0984e3', nurse: '#00b894',
  coordinator: '#fdcb6e', auditor: '#a29bfe', admin: '#2d3436',
};

@Component({
  selector: 'app-user-view-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
<div class="vd">
  <div class="vd-header" [style.background]="roleColor">
    <div class="vd-avatar">
      <img *ngIf="photoUrl" [src]="photoUrl" [alt]="fullName" (error)="photoUrl=''" />
      <span *ngIf="!photoUrl">{{ initials }}</span>
    </div>
    <div class="vd-title">
      <h2>{{ fullName }}</h2>
      <span class="rc">{{ roleName | titlecase }}</span>
    </div>
    <button mat-icon-button class="cb" (click)="dialogRef.close()">
      <mat-icon>close</mat-icon>
    </button>
  </div>

  <mat-dialog-content class="vd-body">

    <div class="sec">
      <div class="sec-t">Contact</div>
      <div class="ig">
        <div class="ii full"><mat-icon>email</mat-icon><span>{{ u.email }}</span></div>
        <div class="ii" *ngIf="u.phone"><mat-icon>phone</mat-icon><span>{{ u.phone }}</span></div>
        <div class="ii" *ngIf="u.gender"><mat-icon>person</mat-icon><span>{{ u.gender | titlecase }}</span></div>
        <div class="ii" *ngIf="u.nationalId"><mat-icon>badge</mat-icon><span>{{ u.nationalId }}</span></div>
        <div class="ii full" *ngIf="u.address"><mat-icon>location_on</mat-icon><span>{{ u.address }}</span></div>
        <div class="ii" *ngIf="u.maritalStatus"><mat-icon>favorite</mat-icon><span>{{ u.maritalStatus | titlecase }}</span></div>
      </div>
    </div>

    <ng-container *ngIf="serviceName">
      <mat-divider></mat-divider>
      <div class="sec">
        <div class="sec-t">Service</div>
        <div class="ig">
          <div class="ii full">
            <mat-icon>business</mat-icon>
            <span class="svc">{{ serviceName }}</span>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="roleName === 'patient'">
      <mat-divider></mat-divider>
      <div class="sec">
        <div class="sec-t">Patient Info</div>
        <div class="ig">
          <div class="ii" *ngIf="u.dateOfBirth">
            <mat-icon>cake</mat-icon>
            <span>{{ u.dateOfBirth | date:'dd/MM/yyyy' }} ({{ age }} ans)</span>
          </div>
          <div class="ii" *ngIf="u.medicalRecordNumber">
            <mat-icon>assignment</mat-icon><span>{{ u.medicalRecordNumber }}</span>
          </div>
          <div class="ii" *ngIf="u.emergencyContact">
            <mat-icon>emergency</mat-icon><span>{{ u.emergencyContact }}</span>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-container *ngIf="roleName === 'doctor' && u.specialization">
      <mat-divider></mat-divider>
      <div class="sec">
        <div class="sec-t">Specialization</div>
        <div class="ig">
          <div class="ii"><mat-icon>medical_services</mat-icon><span>{{ u.specialization }}</span></div>
        </div>
      </div>
    </ng-container>

    <mat-divider></mat-divider>
    <div class="sec">
      <div class="sec-t">Status</div>
      <span class="badge" [class.active]="u.isActive && !u.isArchived"
        [class.inactive]="!u.isActive && !u.isArchived" [class.archived]="u.isArchived">
        {{ u.isArchived ? 'Archived' : u.isActive ? 'Active' : 'Inactive' }}
      </span>
    </div>

  </mat-dialog-content>

  <mat-dialog-actions align="end">
    <button mat-button (click)="dialogRef.close()">Close</button>
  </mat-dialog-actions>
</div>
  `,
  styles: [`
    .vd { min-width: 420px; }
    .vd-header { display:flex; align-items:center; gap:16px; padding:20px 24px; color:#fff; position:relative; border-radius:4px 4px 0 0; }
    .vd-avatar { width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,.25); display:flex; align-items:center; justify-content:center; font-size:1.4rem; font-weight:700; overflow:hidden; flex-shrink:0; }
    .vd-avatar img { width:100%; height:100%; object-fit:cover; }
    .vd-title h2 { margin:0; font-size:1.1rem; font-weight:700; }
    .rc { background:rgba(255,255,255,.25); padding:2px 10px; border-radius:12px; font-size:.75rem; }
    .cb { position:absolute; right:8px; top:8px; color:#fff; }
    .vd-body { padding:16px 24px !important; max-height:60vh; overflow-y:auto; }
    .sec { margin:10px 0; }
    .sec-t { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.8px; color:#888; margin-bottom:8px; }
    .ig { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
    .ii { display:flex; align-items:center; gap:6px; font-size:.85rem; color:#444; }
    .ii mat-icon { font-size:16px; width:16px; height:16px; color:#888; }
    .ii.full { grid-column:1/-1; }
    .svc { font-weight:600; color:#0984e3; }
    mat-divider { margin:10px 0; }
    .badge { padding:3px 12px; border-radius:12px; font-size:.75rem; font-weight:700; }
    .badge.active   { background:#e8f5e9; color:#2e7d32; }
    .badge.inactive { background:#fff3e0; color:#e65100; }
    .badge.archived { background:#ffebee; color:#c62828; }
    mat-dialog-actions { padding:8px 24px !important; }
  `],
})
export class UserViewDialog {
  photoUrl: string;
  u: UserRow;

  constructor(
    public dialogRef: MatDialogRef<UserViewDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UserRow,
  ) {
    this.u = data;
    this.photoUrl = data.photo ? `${environment.apiUrl}/uploads/${data.photo}` : '';
  }

  get fullName(): string {
    return `${this.u.firstName} ${this.u.lastName}`;
  }

  get initials(): string {
    return ((this.u.firstName?.[0] ?? '') + (this.u.lastName?.[0] ?? '')).toUpperCase();
  }

  get roleName(): string {
    const r = this.u.role;
    if (!r) return '';
    return (typeof r === 'string' ? r : r.name ?? '').toLowerCase();
  }

  get roleColor(): string {
    return ROLE_COLORS[this.roleName] ?? '#6c5ce7';
  }

  get serviceName(): string {
    const s = this.u.serviceId;
    if (!s) return '';
    if (typeof s === 'object') return (s as any).name ?? '';
    return s;
  }

  get age(): number {
    if (!this.u.dateOfBirth) return 0;
    const d = new Date(this.u.dateOfBirth);
    const t = new Date();
    let age = t.getFullYear() - d.getFullYear();
    if (t.getMonth() - d.getMonth() < 0 || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--;
    return age;
  }
}
