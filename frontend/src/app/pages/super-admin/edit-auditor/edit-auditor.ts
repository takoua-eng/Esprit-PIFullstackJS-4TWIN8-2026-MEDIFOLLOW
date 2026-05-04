import { environment } from 'src/environments/environment';
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MaterialModule } from 'src/app/material.module';
import {
  AuditorService,
  Auditor,
} from 'src/app/services/superadmin/auditor.service';

@Component({
  selector: 'app-edit-auditor-dialog',
  standalone: true,
  templateUrl: './edit-auditor.html',
  styleUrls: ['./edit-auditor.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MaterialModule,
  ],
})
export class EditAuditorDialog implements OnInit {
  auditorForm!: FormGroup;
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  hidePassword = true;
  loading = false;

  // ✅ AJOUTER : currentUserId pour la sécurité du toggle
  currentUserId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auditorService: AuditorService,
    private dialogRef: MatDialogRef<EditAuditorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Auditor,
  ) {
    // ✅ Récupérer l'ID de l'utilisateur courant (optionnel)
    this.currentUserId = localStorage.getItem('currentUserId');
  }

  ngOnInit(): void {
    this.initForm();

    // Charger la photo si elle existe
    if (this.data?.photo) {
      this.photoPreview = `${environment.apiUrl}/uploads/${this.data.photo}`;
    }
  }

  private initForm(): void {
    this.auditorForm = this.fb.group({
      firstName: [this.data?.firstName || '', Validators.required],
      lastName: [this.data?.lastName || '', Validators.required],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      password: [''], // Optionnel - seulement si changement
      phone: [this.data?.phone || ''],
      address: [this.data?.address || ''],
      nationalId: [this.data?.nationalId || ''],
      gender: [this.data?.gender || ''],
      isActive: [this.data?.isActive ?? true], // ✅ Valeur par défaut
    });
  }

  // ✅ AJOUTER : Méthode getFullName() pour le template
  getFullName(): string {
    const firstName =
      this.auditorForm.value?.firstName || this.data?.firstName || '';
    const lastName =
      this.auditorForm.value?.lastName || this.data?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  }

  // ✅ AJOUTER : Méthode getInitials() pour l'avatar
  getInitials(firstName: string, lastName: string): string {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
  }

  // ✅ AJOUTER : Méthode onImageError() pour gérer les erreurs d'image
  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    if (this.auditorForm.invalid) {
      this.auditorForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const values = this.auditorForm.value;

    // Append tous les champs
    Object.keys(values).forEach((key) => {
      // Password: seulement si renseigné
      if (key === 'password' && !values[key]) return;
      if (values[key] !== null && values[key] !== undefined) {
        formData.append(key, String(values[key]).trim());
      }
    });

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.auditorService.updateAuditor(this.data._id, formData).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        alert('Error: ' + (err.message || 'Failed to update auditor'));
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
