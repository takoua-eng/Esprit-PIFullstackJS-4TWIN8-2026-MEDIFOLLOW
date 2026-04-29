// src/app/pages/super-admin/confirm-dialog/confirm-dialog.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// ✅ Interface pour le type des données
export interface ConfirmDialogData {
  message: string;
  title?: string; // Optionnel
  confirmText?: string; // Optionnel
  cancelText?: string; // Optionnel
}

@Component({
  selector: 'app-sa-auditor-confirm-dialog',
  standalone: true,
  template: `
    <div class="p-4">
      <div class="d-flex align-items-center mb-3">
        <mat-icon color="warn" class="me-2">warning</mat-icon>
        <h3 class="mb-0">{{ data.title || 'Confirmation' }}</h3>
      </div>
      <p class="text-muted mb-4">{{ data.message }}</p>
      <div class="d-flex justify-content-end gap-2">
        <button mat-stroked-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button mat-raised-button color="warn" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          {{ data.confirmText || 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .p-4 {
        padding: 24px;
      }
      .mb-3 {
        margin-bottom: 1rem;
      }
      .mb-4 {
        margin-bottom: 1.5rem;
      }
      .mb-0 {
        margin: 0;
      }
      .me-2 {
        margin-right: 8px;
      }
      .text-muted {
        color: #6c757d;
      }
      .d-flex {
        display: flex;
      }
      .align-items-center {
        align-items: center;
      }
      .justify-content-end {
        justify-content: flex-end;
      }
      .gap-2 {
        gap: 12px;
      }
    `,
  ],
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
})
export class ConfirmDialog {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData, // ✅ CORRECTION ICI
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
