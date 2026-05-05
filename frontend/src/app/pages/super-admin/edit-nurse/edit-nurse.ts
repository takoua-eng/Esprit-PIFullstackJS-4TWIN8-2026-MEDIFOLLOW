import { environment } from 'src/environments/environment';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

// MATERIAL
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MaterialModule } from 'src/app/material.module';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

@Component({
  selector: 'app-edit-nurse',
  standalone: true,
  templateUrl: './edit-nurse.html',
  styleUrls: ['./edit-nurse.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MaterialModule,
  ],
})
export class EditNurse implements OnInit {
  nurseForm!: FormGroup;
  services: any[] = [];

  selectedFile: File | null = null;
  photoPreview: string | null = null;
  hidePassword = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private serviceService: ServiceService,
    private dialogRef: MatDialogRef<EditNurse>,
    @Inject(MAT_DIALOG_DATA) public data: any, // ✅ CORRECTION ICI: 'data: any'
  ) {
    console.log('📥 EditNurse - Constructor - Data reçue:', this.data);
  }

  ngOnInit(): void {
    console.log('🎨 EditNurse - ngOnInit');
    console.log('📊 MAT_DIALOG_DATA complet:', this.data);

    if (!this.data) {
      console.error('❌ Aucune donnée reçue!');
      return;
    }

    const doc: any = (this.data as any).data || (this.data as any).user || this.data || {};

    // Extract serviceId correctly
    let serviceId = '';
    if (doc.serviceId) {
      if (typeof doc.serviceId === 'object') {
        serviceId = doc.serviceId._id || doc.serviceId.id;
        console.log('✅ serviceId extrait (objet):', serviceId);
      } else {
        serviceId = doc.serviceId;
        console.log('✅ serviceId extrait (string):', serviceId);
      }
    } else if (doc.assignedService) {
      serviceId = doc.assignedService;
    } else {
      console.warn('⚠️ serviceId manquant dans data');
    }

    // DEBUG: Afficher toutes les valeurs
    console.log('📝 Valeurs pour le formulaire:', {
      firstName: doc.firstName,
      lastName: doc.lastName,
      email: doc.email,
      phone: doc.phone,
      address: doc.address,
      nationalId: doc.nationalId,
      gender: doc.gender,
      serviceId: serviceId,
    });

    // Initialize form with nurse data
    this.nurseForm = this.fb.group({
      firstName: [doc.firstName || '', Validators.required],
      lastName: [doc.lastName || '', Validators.required],
      email: [doc.email || '', [Validators.required, Validators.email]],
      password: [''], // Empty by default - optional
      phone: [doc.phone || ''],
      address: [doc.address || ''],
      nationalId: [doc.nationalId || ''],
      gender: [doc.gender || ''],
      serviceId: [serviceId],
    });

    console.log('✅ nurseForm initialisé:', this.nurseForm.value);

    // Load photo preview if exists
    if (this.data?.photo) {
      this.photoPreview = `http://localhost:3000/uploads/${this.data.photo}`;
      console.log('🖼️ Photo chargée:', this.photoPreview);
    }

    this.loadServices();
  }

  loadServices(): void {
    this.serviceService.getServices().subscribe({
      next: (res) => {
        console.log('✅ Services chargés:', res);
        this.services = res;
      },
      error: (err) => console.error('❌ Error loading services:', err),
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  getInitials(firstName: string, lastName: string): string {
    const f = firstName?.charAt(0)?.toUpperCase() || '';
    const l = lastName?.charAt(0)?.toUpperCase() || '';
    return f + l || '?';
  }

  onSubmit(): void {
    if (this.nurseForm.invalid) {
      this.nurseForm.markAllAsTouched();
      console.log('❌ Formulaire invalide');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const values = this.nurseForm.value;

    formData.append('firstName', values.firstName?.trim());
    formData.append('lastName', values.lastName?.trim());
    formData.append('email', values.email?.trim().toLowerCase());

    if (values.phone?.trim()) formData.append('phone', values.phone.trim());
    if (values.address?.trim())
      formData.append('address', values.address.trim());
    if (values.nationalId?.trim())
      formData.append('nationalId', values.nationalId.trim());
    if (values.gender?.trim()) formData.append('gender', values.gender.trim());
    if (values.serviceId?.trim())
      formData.append('serviceId', values.serviceId.trim());

    if (values.password && values.password.trim() !== '') {
      formData.append('password', values.password);
      console.log('🔄 New password will be updated');
    }

    if (this.selectedFile) {
      formData.append('file', this.selectedFile);
    }

    console.log('📤 PUT /users/' + this.data._id);

    this.nurseService.updateNurse(this.data._id, formData).subscribe({
      next: (res) => {
        console.log('✅ Mise à jour réussie:', res);
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        console.error('❌ Erreur update:', err);
        this.loading = false;
        alert(
          'Erreur: ' + (err.error?.message || err.message || 'Unknown error'),
        );
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
