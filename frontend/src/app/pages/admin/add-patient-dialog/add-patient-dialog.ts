import { TranslateModule } from '@ngx-translate/core';
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PatientService } from 'src/app/services/admin/patient.service';
import { DoctorService } from 'src/app/services/admin/doctor.service';
import { NurseService } from 'src/app/services/admin/nurse.service';
import { CoordinateurService } from 'src/app/services/admin/coordinateur.service';
import { ServiceService } from 'src/app/services/admin/service.service';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatOptionModule } from '@angular/material/core';

export interface PatientData {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gender?: string;
  nationalId?: string;
  address?: string;
  dateOfBirth?: Date | string;
  maritalStatus?: string;
  medicalRecordNumber?: string;
  emergencyContact?: string;
  photo?: File | string;
  // Care team
  assignedDoctor?: string;
  assignedNurse?: string;
  assignedCoordinator?: string;
  assignedService?: string;
}

@Component({
  selector: 'app-add-patient-dialog',
  standalone: true,
  imports: [
    TranslateModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './add-patient-dialog.html',
  styleUrls: ['./add-patient-dialog.scss'],
})
export class AddPatientDialog implements OnInit {
  patientForm: FormGroup;
  photoPreview: string | null = null;
  selectedFile: File | null = null;
  isSubmitted = false;
  isEditMode = false;
  today: Date = new Date();

  // Listes pour les selects
  doctorsList: any[] = [];
  nursesList: any[] = [];
  coordinatorsList: any[] = [];
  servicesList: any[] = [];
  filteredDoctorsList: any[] = [];
  filteredNursesList: any[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddPatientDialog>,
    private patientService: PatientService,
    private doctorService: DoctorService,
    private nurseService: NurseService,
    private coordinateurService: CoordinateurService,
    private serviceService: ServiceService,
    @Inject(MAT_DIALOG_DATA) public data: { patient?: PatientData }
  ) {
    this.patientForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50),
      Validators.pattern(/^[a-zA-Z\u0600-\u06FF\s]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+216|00216|0)?[2-9]\d{7}$/)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      address: ['', [Validators.minLength(10), Validators.maxLength(200)]],
      dateOfBirth: [null, [Validators.required, this.minAgeValidator(18)]],
      age: [{ value: '', disabled: true }],
      gender: ['', Validators.required],
      maritalStatus: ['', Validators.required],
      medicalRecordNumber: [{ value: this.generateMRN(), disabled: true }],
      emergencyContact: ['', [Validators.required,
      Validators.pattern(/^(\+216|00216|0)?[2-9]\d{7}$/)]],
      // Care team
      assignedDoctor: [''],
      assignedNurse: [''],
      assignedCoordinator: [''],
      assignedService: [''],

    });

    // Mode édition
    if (data?.patient) {
      this.isEditMode = true;
      this.patientForm.patchValue({
        ...data.patient,
        password: '',
      });
      this.patientForm.get('password')?.clearValidators();
      this.patientForm.get('password')?.updateValueAndValidity();

      if (data.patient.photo) {
        this.photoPreview =
          typeof data.patient.photo === 'string'
            ? data.patient.photo
            : URL.createObjectURL(data.patient.photo);
      }
    }
  }



  // Dans ngOnInit, remplacer le chargement doctors/nurses par :
  ngOnInit(): void {
    this.patientForm.get('dateOfBirth')?.valueChanges.subscribe((date) => {
      if (date) {
        const age = this.calculateAge(date);
        this.patientForm.patchValue({ age }, { emitEvent: false });
      }
    });

    // Écouter le changement de service
    this.patientForm.get('assignedService')?.valueChanges.subscribe((serviceId) => {
      if (serviceId) {
        this.filterByService(serviceId);
      } else {
        // Si aucun service sélectionné, afficher tout
        this.filteredDoctorsList = this.doctorsList;
        this.filteredNursesList = this.nursesList;
      }
      // Reset les selects doctor/nurse/coordinator quand le service change
      this.patientForm.patchValue({
        assignedDoctor: '',
        assignedNurse: '',
        assignedCoordinator: '',
      }, { emitEvent: false });
    });

    // Charger toutes les listes
    this.doctorService.getDoctors().subscribe({
      next: (res) => {
        this.doctorsList = res;
        this.filteredDoctorsList = res;
      },
      error: (err) => console.error('Erreur doctors:', err),
    });

    this.nurseService.getNurses().subscribe({
      next: (res) => {
        this.nursesList = res;
        this.filteredNursesList = res;
      },
      error: (err) => console.error('Erreur nurses:', err),
    });

    this.coordinateurService.getCoordinators().subscribe({
      next: (res) => (this.coordinatorsList = res),
      error: (err) => console.error('Erreur coordinators:', err),
    });

    this.serviceService.getServices().subscribe({
      next: (res) => (this.servicesList = res),
      error: (err) => console.error('Erreur services:', err),
    });
  }

  // Méthode de filtrage
  private filterByService(serviceId: string): void {
    this.filteredDoctorsList = this.doctorsList.filter(
      (d) => d.assignedService === serviceId || d.serviceId === serviceId
    );
    this.filteredNursesList = this.nursesList.filter(
      (n) => n.assignedService === serviceId || n.serviceId === serviceId
    );
  }

  // =============================
  // VALIDATORS
  // =============================

  minAgeValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return { required: true };
      const birthDate = new Date(control.value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      return age < minAge ? { minAge: { required: minAge, actual: age } } : null;
    };
  }

  // =============================
  // PHOTO
  // =============================

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

  // =============================
  // SUBMIT
  // =============================

  onSubmit(): void {
    this.isSubmitted = true;
    Object.keys(this.patientForm.controls).forEach((key) =>
      this.patientForm.get(key)?.markAsTouched()
    );

    if (!this.patientForm.valid) {
      alert('Veuillez remplir tous les champs obligatoires correctement.');
      return;
    }

    const values = this.patientForm.getRawValue();
    const formData = new FormData();

    Object.keys(values).forEach((key) => {
      if (this.isEditMode && key === 'password' && !values[key]) return;

      let value = values[key];

      if (key === 'dateOfBirth' && value) {
        value = new Date(value).toISOString();
      }

      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      }
    });

    if (this.selectedFile) formData.append('file', this.selectedFile);

    if (!this.isEditMode) {
      this.patientService.checkEmail(values.email).subscribe({
        next: (exists) => {
          if (exists) {
            alert(`L'email ${values.email} est déjà utilisé.`);
            return;
          }
          this.patientService.createPatient(formData).subscribe({
            next: (res) => this.dialogRef.close(res),
            error: (err) => alert(err.error?.message || 'Erreur création patient.'),
          });
        },
      });
    } else if (this.data.patient?._id) {
      this.patientService.updatePatient(this.data.patient._id, formData).subscribe({
        next: (res) => this.dialogRef.close(res),
        error: (err) => alert(err.error?.message || 'Erreur mise à jour patient.'),
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // =============================
  // HELPERS
  // =============================

  private generateMRN(): string {
    const prefix = 'MRN';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }
}