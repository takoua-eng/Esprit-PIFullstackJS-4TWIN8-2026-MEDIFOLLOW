import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, NgForm } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UserService } from 'src/app/services/users.service';

@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [MatDialogModule, MaterialModule, FormsModule],
  templateUrl: './edit-profile-dialog.component.html',
})
export class EditProfileDialogComponent {
  firstName = '';
  lastName = '';
  phone = '';
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<EditProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private userService: UserService,
    private snackBar: MatSnackBar,
  ) {
    const user = data?.user || {};
    this.firstName = user.firstName ?? '';
    this.lastName = user.lastName ?? '';
    this.phone = user.phone ?? '';
  }

  save(form?: NgForm): void {
    if (this.isSaving) return;
    if (form && form.invalid) return;
    if (!this.firstName?.trim() || !this.lastName?.trim()) {
      return;
    }
    this.isSaving = true;
    const dto = { firstName: this.firstName.trim(), lastName: this.lastName.trim(), phone: this.phone?.trim() };
    const id = this.data?.user?._id || this.data?.user?.id;
    if (!id) {
      this.isSaving = false;
      this.dialogRef.close(null);
      return;
    }

    this.userService.updateUser(id, dto).subscribe({
      next: (res) => {
        this.isSaving = false;
        try { this.snackBar.open('Profil mis à jour', undefined, { duration: 2500 }); } catch {}
        this.dialogRef.close(res);
      },
      error: () => {
        this.isSaving = false;
        try { this.snackBar.open('Échec de la mise à jour', 'Fermer', { duration: 5000 }); } catch {}
        this.dialogRef.close(null);
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

}
