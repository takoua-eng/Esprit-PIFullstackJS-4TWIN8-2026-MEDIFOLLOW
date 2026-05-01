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
import { DoctorService } from 'src/app/services/admin/doctor.service';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';
import { ServiceService } from 'src/app/services/admin/service.service';

export interface DoctorData {
  _id?: string; // seulement pour update
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  specialty?: string;
  licenseNumber?: string;
  yearsOfExperience?: number;
  
  address?: string;
  assignedService?: string;
  photo?: File | string;
}

@Component({
  selector: 'AddMedecinDialog',
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
  templateUrl: './add-medecin-dialog.html',
  styleUrls: ['./add-medecin-dialog.scss'],
})
export class AddDoctorDialog implements OnInit {
  doctorForm: FormGroup;
  photoPreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitted = false;
  isEditMode = false; // différencie ajout / update
     servicesList: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddDoctorDialog>,
    private doctorService: DoctorService,
          private serviceService: ServiceService,
    
    @Inject(MAT_DIALOG_DATA) public data: { doctor?: DoctorData }
  ) {
    this.doctorForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]], // obligatoire seulement pour ajout
      phone: ['', [Validators.required, Validators.pattern(/^(\+216|00216|0)?[2-9]\d{7}$/)]],
      gender: ['', Validators.required],
      address: ['', [Validators.minLength(5), Validators.maxLength(200)]],
      specialization: ['', Validators.required],
      licenseNumber: [{ value: this.generateLicenseNumber(), disabled: true }],
      yearsOfExperience: [0, [Validators.required, Validators.min(0)]],
      assignedService: [''],
    });

    // Mode édition si on reçoit des données
    if (data.doctor) {
      this.isEditMode = true;
      this.doctorForm.patchValue({
        ...data.doctor,
        password: '', // jamais pré-rempli
      });
      this.doctorForm.get('password')?.clearValidators();
      this.doctorForm.get('password')?.updateValueAndValidity();

      if (data.doctor.photo) {
        // si photo existante dans BD
        this.photoPreview =
          typeof data.doctor.photo === 'string'
            ? data.doctor.photo
            : URL.createObjectURL(data.doctor.photo);
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

  removePhoto(): void {
    this.photoPreview = null;
    this.selectedFile = null;
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) input.value = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Veuillez sélectionner une image valide');
        input.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Image trop volumineuse (max 5MB)');
        input.value = '';
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => (this.photoPreview = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  onSubmit(): void {
    this.isSubmitted = true;
    Object.keys(this.doctorForm.controls).forEach((key) =>
      this.doctorForm.get(key)?.markAsTouched()
    );

    if (!this.doctorForm.valid) {
      alert('Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    const values = this.doctorForm.getRawValue();
    if (values.gender) values.gender = values.gender.toLowerCase();

    const formData = new FormData();
    Object.keys(values).forEach((key) => {
      // ignore password vide en édition
      if (this.isEditMode && key === 'password' && !values[key]) return;
      const value = values[key];
      if (value !== null && value !== undefined) formData.append(key, value);
    });

    if (this.selectedFile) formData.append('file', this.selectedFile);

    if (!this.isEditMode) {
      // Création
      if (!values.licenseNumber) {
        values.licenseNumber = this.generateLicenseNumber();
        this.doctorForm.get('licenseNumber')?.setValue(values.licenseNumber);
      }

      this.doctorService.checkEmail(values.email).subscribe({
        next: (exists) => {
          if (exists) {
            alert(`L'email ${values.email} est déjà utilisé.`);
            return;
          }
          this.doctorService.createDoctor(formData).subscribe({
            next: (res) => this.dialogRef.close(res),
            error: (err) => alert(err.error?.message || 'Erreur création doctor.'),
          });
        },
      });
    } else if (this.data.doctor?._id) {
      // Mise à jour
      this.doctorService.updateDoctor(this.data.doctor._id, formData).subscribe({
        next: (res) => this.dialogRef.close(res),
        error: (err) => alert(err.error?.message || 'Erreur mise à jour doctor.'),
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private generateLicenseNumber(): string {
    const prefix = 'DOC';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }
}