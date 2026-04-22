import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { UsersApiService, UserListRow } from 'src/app/services/users-api.service';
import { Medication, PrescriptionsApiService, PrescriptionDto } from 'src/app/services/prescriptions-api.service';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-doctor-prescriptions',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    TablerIconsModule,
    TranslateModule,
  ],
  templateUrl: './doctor-prescriptions.component.html',
  styleUrls: ['./doctor-prescriptions.component.scss'],
})
export class DoctorPrescriptionsComponent implements OnInit, AfterViewInit {
  @ViewChild('sigCanvas') sigCanvas!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private drawing = false;

  patients: UserListRow[] = [];
  selectedPatientId = '';
  notes = '';

  // Current medication being typed
  tempMed = { name: '', dosage: '', frequency: '', duration: '' };
  
  // List of medications for current prescription
  medications: Medication[] = [];

  prescriptions: PrescriptionDto[] = [];
  loading = false;

  displayedColumns: string[] = [
    'createdAt',
    'patientName',
    'medications',
    'notes',
    'actions'
  ];

  constructor(
    private readonly usersApi: UsersApiService,
    private readonly prescribingApi: PrescriptionsApiService,
    private readonly core: CoreService
  ) {}

  ngOnInit(): void {
    this.usersApi.getPatients().subscribe({
      next: (rows) => {
        this.patients = rows;
        if (rows.length) this.selectedPatientId = rows[0]._id;
      },
    });
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    const canvas = this.sigCanvas.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#000';
  }

  loadHistory(): void {
    const me = this.core.currentUser();
    if (!me?._id) return;

    this.prescribingApi.getDoctorPrescriptions(me._id).subscribe({
      next: (rows) => {
        this.prescriptions = rows;
      }
    });
  }

  addMedication(): void {
    if (!this.tempMed.name.trim()) return;
    this.medications.push({ ...this.tempMed });
    this.tempMed = { name: '', dosage: '', frequency: '', duration: '' };
  }

  removeMedication(index: number): void {
    this.medications.splice(index, 1);
  }

  // Signature Pad Logic
  startDrawing(event: MouseEvent | TouchEvent): void {
    this.drawing = true;
    const pos = this.getPos(event);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  draw(event: MouseEvent | TouchEvent): void {
    if (!this.drawing) return;
    event.preventDefault();
    const pos = this.getPos(event);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  stopDrawing(): void {
    this.drawing = false;
  }

  clearSignature(): void {
    const canvas = this.sigCanvas.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private getPos(event: MouseEvent | TouchEvent): { x: number, y: number } {
    const canvas = this.sigCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    } else {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
  }

  save(): void {
    const me = this.core.currentUser();
    if (!this.selectedPatientId || this.medications.length === 0 || !me?._id) return;

    const signature = this.sigCanvas.nativeElement.toDataURL('image/png');

    const dto: PrescriptionDto = {
      patientId: this.selectedPatientId,
      doctorId: me._id,
      medications: this.medications,
      notes: this.notes,
      signature: signature
    };

    this.prescribingApi.issue(dto).subscribe({
      next: (saved) => {
        this.prescriptions = [saved, ...this.prescriptions];
        this.resetForm();
      }
    });
  }

  private resetForm(): void {
    this.medications = [];
    this.notes = '';
    this.clearSignature();
  }

  deletePrescription(id: string): void {
    if (!confirm('Are you sure?')) return;
    this.prescribingApi.delete(id).subscribe({
      next: () => {
        this.prescriptions = this.prescriptions.filter(p => p._id !== id);
      }
    });
  }
}
