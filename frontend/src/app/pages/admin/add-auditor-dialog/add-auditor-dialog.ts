import { TranslateModule } from '@ngx-translate/core';
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AuditorData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  certifications: string;
  yearsExperience: number;
  focusArea: string;
}

@Component({
  selector: 'app-super-add-auditor-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './add-auditor-dialog.html',
  styleUrls: ['./add-auditor-dialog.scss']
})
export class AddAuditorDialog {
  auditorForm: FormGroup;

  departmentOptions = ['Cardiology', 'Neurology', 'Oncology', 'Pediatrics', 'Orthopedics', 'General Medicine', 'Surgery', 'ICU'];
  focusAreaOptions = ['Quality Assurance', 'Compliance', 'Financial Audit', 'Operational Efficiency', 'Patient Safety', 'Clinical Standards', 'Administrative Processes'];
  certificationOptions = ['CPA', 'CISA', 'CGAP', 'CCSA', 'ISO 9001', 'Healthcare Compliance', 'Internal Audit'];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddAuditorDialog>,
    @Inject(MAT_DIALOG_DATA) public data: Partial<AuditorData>
  ) {
    this.auditorForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)]],
      department: ['', Validators.required],
      certifications: ['', Validators.required],
      yearsExperience: ['', [Validators.required, Validators.min(0), Validators.max(60)]],
      focusArea: ['', Validators.required]
    });
  }

  getErrorMessage(fieldName: string): string {
    const control = this.auditorForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control?.hasError('minLength')) {
      const minLength = control.getError('minLength').requiredLength;
      return `${this.getFieldLabel(fieldName)} must be at least ${minLength} characters`;
    }
    if (control?.hasError('email')) {
      return 'Please enter a valid email address';
    }
    if (control?.hasError('pattern')) {
      return `${this.getFieldLabel(fieldName)} must be a valid phone number`;
    }
    if (control?.hasError('min')) {
      return `${this.getFieldLabel(fieldName)} cannot be negative`;
    }
    if (control?.hasError('max')) {
      return `${this.getFieldLabel(fieldName)} is too high`;
    }
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      department: 'Department',
      certifications: 'Certifications',
      yearsExperience: 'Years of Experience',
      focusArea: 'Focus Area'
    };
    return labels[fieldName] || fieldName;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.auditorForm.valid) {
      this.dialogRef.close(this.auditorForm.value as AuditorData);
    }
  }
}
