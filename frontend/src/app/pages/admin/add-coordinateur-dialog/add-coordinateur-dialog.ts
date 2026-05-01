import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { CoordinateurService } from 'src/app/services/superadmin/coordinateur.service';

// Angular Material
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { ServiceService } from 'src/app/services/superadmin/service.service';
export interface CoordinatorData {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  role?: string;
  yearsExperience?: number;
  photo?: File | string;
}

@Component({
  selector: 'AddCoordinatorDialog',
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './add-coordinateur-dialog.html',
  styleUrls: ['./add-coordinateur-dialog.scss'],
})
export class AddCoordinatorDialog implements OnInit {
  coordinatorForm: FormGroup;

  photoPreview: string | null = null;
  selectedFile: File | null = null;

  isSubmitted = false;
  isEditMode = false;
  roleOptions: any;
  departmentOptions: any;
  servicesList: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddCoordinatorDialog>,
    private coordService: CoordinateurService,
      private serviceService: ServiceService,

    @Inject(MAT_DIALOG_DATA) public data: { coordinator?: CoordinatorData }
  ) {
    this.coordinatorForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]], // obligatoire seulement pour ajout
      phone: ['', [Validators.required, Validators.pattern(/^(\+216|00216|0)?[2-9]\d{7}$/)]],
      gender: ['', Validators.required],
      address: ['', [Validators.minLength(5), Validators.maxLength(200)]],
      licenseNumber: [{ value: this.generateLicenseNumber(), disabled: true }],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      
    });

    // ✅ MODE EDIT
    if (data.coordinator) {
      this.isEditMode = true;

      this.coordinatorForm.patchValue({
        ...data.coordinator,
        password: '',
      });

      this.coordinatorForm.get('password')?.clearValidators();
      this.coordinatorForm.get('password')?.updateValueAndValidity();

      if (data.coordinator.photo) {
        this.photoPreview =
          typeof data.coordinator.photo === 'string'
            ? data.coordinator.photo
            : URL.createObjectURL(data.coordinator.photo);
      }
    }
  }

  ngOnInit(): void {
  this.serviceService.getServices().subscribe({
    next: (res) => {
      this.servicesList = res;
    },
    error: (err) => console.error(err)
  });
}

  // ✅ IMAGE
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files?.[0]) {
      const file = input.files[0];

      if (!file.type.startsWith('image/')) {
        alert('Image invalide');
        input.value = '';
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Max 5MB');
        input.value = '';
        return;
      }

      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = () => (this.photoPreview = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.selectedFile = null;
  }

  // ✅ SUBMIT
  onSubmit(): void {
    this.isSubmitted = true;

    // Marquer tous les champs comme touchés
    Object.keys(this.coordinatorForm.controls).forEach((key) =>
      this.coordinatorForm.get(key)?.markAsTouched()
    );

    if (!this.coordinatorForm.valid) {
      alert('Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    const values = this.coordinatorForm.getRawValue();

    // Si gender existe, passer en minuscule
    if (values.gender) values.gender = values.gender.toLowerCase();

    const formData = new FormData();
    Object.keys(values).forEach((key) => {
      // ignorer mot de passe vide en édition
      if (this.isEditMode && key === 'password' && !values[key]) return;
      const value = values[key];
      if (value !== null && value !== undefined) formData.append(key, value);
    });

    if (this.selectedFile) formData.append('file', this.selectedFile);

    if (!this.isEditMode) {
      // Création
      this.coordService.checkEmail(values.email).subscribe({
        next: (res) => {
          if (res.exists) {
            alert(`L'email ${values.email} est déjà utilisé.`);
            return;
          }
          this.coordService.createCoordinator(formData).subscribe({
            next: (res) => this.dialogRef.close(res),
            error: (err) =>
              alert(err.error?.message || 'Erreur création coordinator.'),
          });
        },
        error: (err) =>
          alert(err.error?.message || 'Erreur vérification email coordinator.'),
      });
    } else if (this.data.coordinator?._id) {
      // Mise à jour
      this.coordService
        .updateCoordinator(this.data.coordinator._id, formData)
        .subscribe({
          next: (res) => this.dialogRef.close(res),
          error: (err) =>
            alert(err.error?.message || 'Erreur mise à jour coordinator.'),
        });
    }
  }
  onCancel(): void {
    this.dialogRef.close();
  }

  private generateLicenseNumber(): string {
    const prefix = 'CORD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
}