import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

// MATERIAL
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { NurseService } from 'src/app/services/admin/nurse.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

@Component({
  selector: 'app-add-nurse',
  standalone: true,
  templateUrl: './add-nurse-dialog.html',
  styleUrls: ['./add-nurse-dialog.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
})
export class AddNurse implements OnInit {
  nurseForm: FormGroup;
  services: any[] = [];
  photoPreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitted = false;

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private serviceService: ServiceService,
    private dialogRef: MatDialogRef<AddNurse>,
    private snackBar: MatSnackBar
  ) {
    this.nurseForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: ['', [Validators.required]],
      nationalId: ['', [Validators.required]],
      address: ['', [Validators.required]],
      gender: ['', Validators.required],
      serviceId: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices() {
    this.serviceService.getServices().subscribe({
      next: (data) => (this.services = data),
      error: (err) => console.error(err),
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  getErrorMessage(field: string): string {
    const control = this.nurseForm.get(field);
    if (!control?.errors) return '';

    if (control.errors['required']) return 'Ce champ est obligatoire';
    if (control.errors['email']) return 'Email invalide';
    if (control.errors['minlength'])
      return `Minimum ${control.errors['minlength'].requiredLength} caractères`;

    return 'Champ invalide';
  }

  hasError(field: string): boolean {
    const control = this.nurseForm.get(field);
    return (
      control?.invalid === true &&
      (control?.touched === true || this.isSubmitted)
    );
  }

  onSubmit() {
    this.isSubmitted = true;

    Object.keys(this.nurseForm.controls).forEach((key) => {
      this.nurseForm.get(key)?.markAsTouched();
    });

    if (this.nurseForm.invalid) return;

    const formData = new FormData();

    const values = this.nurseForm.getRawValue();

    Object.keys(values).forEach((key) => {
      formData.append(key, values[key]);
    });

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    this.nurseService.createNurse(formData).subscribe({
      next: () => {
        this.snackBar.open('Nurse added successfully', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error(err);
        const errorMsg = err.error?.message || 'An error occurred while creating the nurse';
        this.snackBar.open(errorMsg, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
        this.isSubmitted = false;
      },
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}