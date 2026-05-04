import { Component, Inject, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from 'src/app/services/users.service';

@Component({
  selector: 'app-edit-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TablerIconComponent
  ],
  templateUrl: './edit-profile-dialog.component.html',
  styleUrls: ['./edit-profile-dialog.component.scss']
})
export class EditProfileDialogComponent implements OnInit {
  form: FormGroup;
  isLoading = false;
  message = '';
  isError = false;

  selectedFile: File | null = null;
  imagePreview: string | null = null;
  initials = 'U';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    public dialogRef: MatDialogRef<EditProfileDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: any, currentAvatarUrl: string | null, computedInitials: string }
  ) {
    this.initials = data.computedInitials;
    this.imagePreview = data.currentAvatarUrl;

    const u = data.user || {};
    this.form = this.fb.group({
      firstName: [u.firstName || u.name || '', Validators.required],
      lastName: [u.lastName || '', Validators.required],
      email: [u.email || '', [Validators.required, Validators.email]],
      phone: [u.phone || u.telephone || ''],
      address: [u.address || '']
    });
  }

  ngOnInit() {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput() {
    document.getElementById('avatar-upload')?.click();
  }

  submit() {
    if (this.form.valid) {
      this.isLoading = true;
      this.message = '';
      this.isError = false;

      const formData = new FormData();
      Object.keys(this.form.value).forEach(key => {
        formData.append(key, this.form.value[key]);
      });

      if (this.selectedFile) {
        formData.append('file', this.selectedFile);
      }

      const userId = this.data.user._id;

      this.userService.updateUser(userId, formData).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.message = 'Profil mis à jour avec succès !';
          this.isError = false;
          setTimeout(() => this.dialogRef.close(res), 1000);
        },
        error: (err) => {
          this.isLoading = false;
          this.message = err.error?.message || 'Erreur lors de la mise à jour.';
          this.isError = true;
        }
      });
    }
  }

  close() {
    this.dialogRef.close(false);
  }
}
