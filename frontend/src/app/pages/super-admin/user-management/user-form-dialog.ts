import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin } from 'rxjs';

import { ServiceService } from '../../../services/superadmin/service.service';
import { RoleService, Role } from '../../../services/superadmin/role.service';
import { DoctorService, Doctor } from '../../../services/superadmin/doctor.service';
import { UserManagementService, UserRow } from '../../../services/superadmin/user-management.service';
import { CoordinateurService, Coordinator } from '../../../services/superadmin/coordinateur.service';
import { NurseService, Nurse } from '../../../services/superadmin/nurse.service';

export interface UserFormData {
  role: string;
  user?: UserRow;
}

/**
 * Roles that show the Service dropdown
 * admin aussi a besoin de serviceId (requis par le backend)
 */
const ROLES_WITH_SERVICE = new Set(['patient','doctor','nurse','admin','coordinator']);

/**
 * Extra fields shown only for specific roles (beyond common + service)
 */
const ROLE_EXTRA: Record<string, string[]> = {
  patient: ['doctorId','dateOfBirth','emergencyContact','medicalRecordNumber'],
  doctor:  ['specialization'],
};

const DEFAULT_SPECIALIZATIONS = [
  'Cardiology','Neurology','Oncology','Pediatrics','Orthopedics',
  'General Medicine','General Surgery','Dermatology','Psychiatry',
  'Radiology','Anesthesiology',
];

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule,
    MatNativeDateModule, MatProgressSpinnerModule,
    MatSlideToggleModule, MatDividerModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrls: ['./user-form-dialog.scss'],
})
export class UserFormDialog implements OnInit {
  form!: FormGroup;
  loading = false;
  isEdit = false;

  services: any[] = [];
  roles: Role[] = [];
  doctors: Doctor[] = [];
  coordinators: Coordinator[] = [];
  nurses: Nurse[] = [];
  filteredNurses: Nurse[] = [];  // nurses du même service que le doctor sélectionné
  specializations = [...DEFAULT_SPECIALIZATIONS];
  newSpecialization = '';

  photoPreview: string | null = null;
  selectedFile: File | null = null;
  hidePassword = true;
  today = new Date();
  calculatedAge: number | null = null;
  autoServiceName = '';  // displayed in readonly field

  currentRoleName = '';

  constructor(
    private fb: FormBuilder,
    private svc: UserManagementService,
    private serviceSvc: ServiceService,
    private roleSvc: RoleService,
    private doctorSvc: DoctorService,
    private coordSvc: CoordinateurService,
    private nurseSvc: NurseService,
    public dialogRef: MatDialogRef<UserFormDialog>,
    @Inject(MAT_DIALOG_DATA) public data: UserFormData,
  ) {
    this.isEdit = !!data.user;
    this.currentRoleName = data.role?.toLowerCase() ?? '';
  }

  ngOnInit(): void {
    this.buildForm();

    forkJoin({
      services:     this.serviceSvc.getActiveServices(),
      roles:        this.roleSvc.getRoles(),
      doctors:      this.doctorSvc.getDoctors(),
      coordinators: this.coordSvc.getCoordinators(),
      nurses:       this.nurseSvc.getNurses(),
    }).subscribe(({ services, roles, doctors, coordinators, nurses }) => {
      this.services     = services;
      this.roles        = roles.filter(r => !r.isArchived && r.name?.toLowerCase() !== 'superadmin');
      this.doctors      = doctors.filter(d => !d.isArchived);
      this.coordinators = coordinators.filter((c: any) => !c.isArchived);
      this.nurses       = (nurses as Nurse[]).filter((n: any) => !n.isArchived);
      this.filteredNurses = [];
      if (this.isEdit && this.data.user) this.patchForm(this.data.user);
    });

    this.form.get('dateOfBirth')?.valueChanges.subscribe(v => {
      this.calculatedAge = v ? this.calcAge(new Date(v)) : null;
    });
  }

  // ── Role change ───────────────────────────────────────────────────
  onRoleChange(roleId: string): void {
    const role = this.roles.find(r => r._id === roleId);
    this.currentRoleName = role?.name?.toLowerCase() ?? '';
    // Reset role-specific fields
    this.form.patchValue({
      serviceId: '', doctorId: '', dateOfBirth: null,
      emergencyContact: '', specialization: '',
    });
    this.calculatedAge = null;
  }

  // ── Auto-fill service when doctor is selected ─────────────────────
  onDoctorChange(doctorId: string): void {
    if (!doctorId) {
      this.form.patchValue({ serviceId: '', nurseId: '' });
      this.autoServiceName = '';
      this.filteredNurses = [];
      return;
    }
    const doctor = this.doctors.find(d => d._id === doctorId);
    if (!doctor?.serviceId) {
      this.form.patchValue({ serviceId: '', nurseId: '' });
      this.autoServiceName = '';
      this.filteredNurses = [];
      return;
    }

    let resolvedServiceId: string;

    if (typeof doctor.serviceId === 'object') {
      const svc = doctor.serviceId as any;
      resolvedServiceId = svc._id;
      this.form.patchValue({ serviceId: svc._id });
      this.autoServiceName = svc.name ?? '';
    } else {
      resolvedServiceId = doctor.serviceId as string;
      this.form.patchValue({ serviceId: doctor.serviceId });
      const found = this.services.find(s => s._id === doctor.serviceId);
      this.autoServiceName = found?.name ?? '';
    }

    // Filter nurses by same serviceId
    this.filteredNurses = this.nurses.filter(n => {
      const nSid = typeof n.serviceId === 'object' ? n.serviceId?._id : n.serviceId;
      return nSid?.toString() === resolvedServiceId?.toString();
    });

    // Reset nurse selection
    this.form.patchValue({ nurseId: '' });
  }

  // Helper: get service name by serviceId (string id)
  getServiceName(serviceId: string): string {
    if (!serviceId) return '';
    // Try to find in services list
    const found = this.services.find(s => s._id === serviceId || s._id?.toString() === serviceId?.toString());
    if (found) return found.name;
    // Fallback: check if doctor has populated serviceId with name
    const doctorId = this.form.get('doctorId')?.value;
    if (doctorId) {
      const doctor = this.doctors.find(d => d._id === doctorId);
      if (doctor?.serviceId && typeof doctor.serviceId === 'object') {
        return (doctor.serviceId as any).name ?? '';
      }
    }
    return serviceId;
  }

  // ── Field visibility helpers ──────────────────────────────────────
  get showService(): boolean  { return ROLES_WITH_SERVICE.has(this.currentRoleName); }
  get showPatient(): boolean  { return this.currentRoleName === 'patient'; }
  get showDoctor(): boolean   { return this.currentRoleName === 'doctor'; }
  get hasRole(): boolean      { return !!this.currentRoleName; }

  // ── Specialization ────────────────────────────────────────────────
  addSpecialization(): void {
    const v = this.newSpecialization.trim();
    if (v && !this.specializations.includes(v)) {
      this.specializations.push(v);
      this.form.patchValue({ specialization: v });
    }
    this.newSpecialization = '';
  }

  // ── Form build ────────────────────────────────────────────────────
  private buildForm(): void {
    const c = (val: any, v: any[] = []) => [val, v];

    const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    const passwordPattern = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    const cinPattern = /^\d{8}$/;
    const phonePattern = /^(\+216)?[2-9]\d{7}$|^\+?[1-9]\d{7,14}$/;

    this.form = this.fb.group({
      roleId:              c(''),
      // Common — required
      firstName:           c('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      lastName:            c('', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]),
      email:               c('', [Validators.required, Validators.pattern(emailPattern)]),
      // Password: required on create, optional on edit
      password:            c('', this.isEdit
        ? [Validators.minLength(8), Validators.pattern(passwordPattern)]
        : [Validators.required, Validators.minLength(8), Validators.pattern(passwordPattern)]),
      // Common — optional
      phone:               c('', [Validators.pattern(phonePattern)]),
      gender:              c(''),
      nationalId:          c('', [Validators.pattern(cinPattern)]),
      address:             c(''),
      maritalStatus:       c(''),
      isActive:            c(true),
      // Service
      serviceId:           c(''),
      // Patient-specific
      doctorId:            c(''),
      coordinatorId:       c(''),
      nurseId:             c(''),
      dateOfBirth:         c(null),
      emergencyContact:    c('', [Validators.pattern(phonePattern)]),
      medicalRecordNumber: c({ value: this.generateMRN(), disabled: true }),
      // Doctor-specific
      specialization:      c(''),
    });
  }

  private patchForm(u: UserRow): void {
    const roleId = u.role?._id ?? (typeof u.role === 'string' ? u.role : '');
    this.currentRoleName = u.role?.name?.toLowerCase() ?? this.currentRoleName;

    this.form.patchValue({
      roleId,
      firstName:        u.firstName ?? '',
      lastName:         u.lastName ?? '',
      email:            u.email ?? '',
      phone:            u.phone ?? '',
      gender:           u.gender ?? '',
      nationalId:       u.nationalId ?? '',
      address:          u.address ?? '',
      maritalStatus:    u.maritalStatus ?? '',
      serviceId:        u.serviceId?._id ?? u.serviceId ?? '',
      doctorId:         (u as any).doctorId ?? '',
      coordinatorId:    (u as any).coordinatorId?._id ?? (u as any).coordinatorId ?? '',
      nurseId:          (u as any).nurseId?._id ?? (u as any).nurseId ?? '',
      dateOfBirth:      u.dateOfBirth ? new Date(u.dateOfBirth) : null,
      emergencyContact: u.emergencyContact ?? '',
      specialization:   u.specialization ?? '',
      isActive:         u.isActive ?? true,
    });
    if (u.photo) this.photoPreview = `http://localhost:3000/uploads/${u.photo}`;
    if (u.dateOfBirth) this.calculatedAge = this.calcAge(new Date(u.dateOfBirth));
  }

  private calcAge(date: Date): number {
    const t = new Date();
    let age = t.getFullYear() - date.getFullYear();
    const m = t.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < date.getDate())) age--;
    return age;
  }

  // ── File ──────────────────────────────────────────────────────────
  onFileSelected(e: Event): void {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f || !f.type.startsWith('image/')) return;
    this.selectedFile = f;
    const r = new FileReader();
    r.onload = () => this.photoPreview = r.result as string;
    r.readAsDataURL(f);
  }

  removePhoto(): void { this.photoPreview = null; this.selectedFile = null; }

  // ── Submit ────────────────────────────────────────────────────────
  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading = true;
    const fd = new FormData();
    const v = this.form.getRawValue();

    // ── 1. Common fields (all roles) ──────────────────────────────
    const commonKeys = ['firstName','lastName','email','phone','gender','nationalId','address','maritalStatus'];
    commonKeys.forEach(k => {
      if (v[k] !== null && v[k] !== undefined && v[k] !== '') fd.append(k, String(v[k]));
    });

    // Password only on create, or if filled on edit
    if (!this.isEdit && v['password']) {
      fd.append('password', v['password']);
    } else if (this.isEdit && v['password'] && v['password'].trim() !== '') {
      fd.append('password', v['password']);
    }

    // ── 2. Service (patient / doctor / nurse / coordinator / admin) ─
    if (this.showService && v['serviceId']) fd.append('serviceId', v['serviceId']);

    // Coordinator-specific: assignedService alias + responsibilities
    if (this.currentRoleName === 'coordinator') {
      if (v['serviceId']) fd.append('assignedService', v['serviceId']);
      fd.append('responsibilities', 'Coordination');
    }

    // ── 3. Patient-specific ───────────────────────────────────────
    if (this.showPatient) {
      if (v['doctorId'])         fd.append('doctorId', v['doctorId']);
      if (v['coordinatorId'])    fd.append('coordinatorId', v['coordinatorId']);
      if (v['nurseId'])          fd.append('nurseId', v['nurseId']);
      if (v['dateOfBirth'])      fd.append('dateOfBirth', (v['dateOfBirth'] as Date).toISOString());
      if (v['emergencyContact']) fd.append('emergencyContact', v['emergencyContact']);
      const mrn = v['medicalRecordNumber'];
      if (mrn) fd.append('medicalRecordNumber', mrn);
    }

    // ── 4. Doctor-specific ────────────────────────────────────────
    if (this.showDoctor && v['specialization']) fd.append('specialization', v['specialization']);

    // ── 5. Status & photo ─────────────────────────────────────────
    fd.append('isActive', String(v['isActive'] ?? true));
    if (this.selectedFile) fd.append('file', this.selectedFile);

    // Debug — remove in production
    console.log('Submitting role:', this.currentRoleName);
    fd.forEach((val, key) => console.log(` ${key}:`, val));

    const obs = this.isEdit
      ? this.svc.update(this.data.user!._id, fd)
      : this.svc.create(this.currentRoleName, fd);

    obs.subscribe({
      next: () => { this.loading = false; this.dialogRef.close(true); },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message ?? err?.message ?? 'Error saving user';
        alert(Array.isArray(msg) ? msg.join('\n') : msg);
      },
    });
  }

  onCancel(): void { this.dialogRef.close(); }

  doctorFullName(d: Doctor): string {
    return `Dr. ${d.firstName} ${d.lastName}${d.specialty ? ' — ' + d.specialty : ''}`;
  }

  private generateMRN(): string {
    return `MRN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }

  get roleLabel(): string {
    return this.currentRoleName
      ? this.currentRoleName.charAt(0).toUpperCase() + this.currentRoleName.slice(1)
      : 'User';
  }
}
