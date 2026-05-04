import { environment } from '../../environments/environment';
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
} from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatFormFieldModule,
  MatError,
  MatHint,
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatOptionModule } from '@angular/material/core';

import { AdminService, Admin } from 'src/app/services/superadmin/admin.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

@Component({
  selector: 'app-edit-admin-dialog',
  standalone: true,
  templateUrl: './edit-admin.html',
  styleUrls: ['./edit-admin.scss'],
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
    MatOptionModule,
    MatError,
    MatHint,
  ],
})
export class EditAdminDialog implements OnInit {
  adminForm!: FormGroup;
  selectedFile: File | null = null;
  photoPreview: string | null = null;
  hidePassword = true;
  loading = false;
  services: any[] = [];
  isSubmitted = false;

  currentUserId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminService,
    private serviceService: ServiceService,
    private dialogRef: MatDialogRef<EditAdminDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Admin,
  ) {
    this.currentUserId = localStorage.getItem('currentUserId');
  }

  ngOnInit(): void {
    this.initForm();
    this.loadServices();

    if (this.data?.photo) {
      this.photoPreview = `${environment.apiUrl}/uploads/${this.data.photo}`;
    }
  }

  // === 🎯 Initialisation du formulaire ===
  private initForm(): void {
    const doc: any = (this.data as any).data || (this.data as any).user || this.data || {};

    let serviceId = '';
    if (doc.serviceId) {
      if (typeof doc.serviceId === 'object') {
        serviceId = doc.serviceId._id || doc.serviceId.id;
      } else {
        serviceId = doc.serviceId;
      }
    } else if (doc.assignedService) {
      serviceId = doc.assignedService;
    }

    this.adminForm = this.fb.group({
      firstName: [
        doc.firstName || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/),
        ],
      ],
      lastName: [
        doc.lastName || '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/),
        ],
      ],
      email: [doc.email || '', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/,
          ),
        ],
      ],
      phone: [
        doc.phone || '',
        [Validators.pattern(/^(\+216|00216|0)?[2-9]\d{7}$/)],
      ],
      nationalId: [
        doc.nationalId || '',
        [Validators.pattern(/^\d{8}$/)],
      ],
      address: [
        doc.address || '',
        [Validators.minLength(10), Validators.maxLength(200)],
      ],
      gender: [doc.gender || ''],
      serviceId: [serviceId, Validators.required],
      isActive: [doc.isActive ?? true],
    });
  }

  // === 🏥 Chargement des services ===
  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (data) => (this.services = data),
      error: (err) => console.error('Error loading services:', err),
    });
  }

  // === 📸 Gestion de la photo ===
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large (max 5MB)');
        input.value = '';
        return;
      }

      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.selectedFile = null;
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    if (input) input.value = '';
  }

  // === 🎯 Helpers pour les erreurs ===
  hasError(field: string): boolean {
    const control = this.adminForm.get(field);
    return (
      control?.invalid === true &&
      (control?.touched === true || this.isSubmitted)
    );
  }

  getErrorMessage(field: string): string {
    const control = this.adminForm.get(field);
    if (!control?.errors) return '';

    const errors: Record<string, string> = {
      required: 'This field is required',
      email: 'Invalid email address',
      minlength: `Minimum ${control.errors['minlength']?.requiredLength} characters`,
      maxlength: `Maximum ${control.errors['maxlength']?.requiredLength} characters`,
      pattern: this.getPatternMessage(field),
    };

    for (const key of Object.keys(control.errors)) {
      if (errors[key]) return errors[key];
    }
    return 'Invalid field';
  }

  private getPatternMessage(field: string): string {
    const messages: Record<string, string> = {
      firstName: 'Only letters allowed (a-z, A-Z, Arabic)',
      lastName: 'Only letters allowed (a-z, A-Z, Arabic)',
      phone: 'Format: 22123456 or +21622123456',
      nationalId: 'Must be 8 digits',
      password: 'Min 8 chars with uppercase, lowercase, number & symbol',
    };
    return messages[field] || 'Invalid format';
  }

  // === 🔤 Initiales pour l'avatar ===
  getInitials(firstName: string, lastName: string): string {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
  }

  getFullName(): string {
    const firstName =
      this.adminForm.value?.firstName || this.data?.firstName || '';
    const lastName =
      this.adminForm.value?.lastName || this.data?.lastName || '';
    return `${firstName} ${lastName}`.trim() || 'Unknown';
  }

  // === 📤 Soumission du formulaire ===
  onSubmit(): void {
    this.isSubmitted = true;

    Object.keys(this.adminForm.controls).forEach((key) => {
      this.adminForm.get(key)?.markAsTouched();
    });

    if (this.adminForm.invalid) return;

    this.loading = true;
    const formData = new FormData();
    const values = this.adminForm.getRawValue();

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

    this.adminService.updateAdmin(this.data._id, formData).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.loading = false;
        console.error('Error updating admin:', err);
        alert('Failed to update admin. Please try again.');
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
