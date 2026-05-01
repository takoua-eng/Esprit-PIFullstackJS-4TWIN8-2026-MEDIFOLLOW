import { TranslateModule } from '@ngx-translate/core';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'admin-confirm-dialog',
  standalone: true,
  imports: [
    TranslateModule,MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Confirmation</h2>

    <mat-dialog-content>
      <p>{{ data.message }}</p>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close="false">Cancel</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">
        Confirm
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}
}
