import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TranslateModule } from '@ngx-translate/core';
import { PrescriptionsApiService, PrescriptionDto } from 'src/app/services/prescriptions-api.service';
import { CoreService } from 'src/app/services/core.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    TablerIconComponent,
    TranslateModule,
  ],
  templateUrl: './patient-prescriptions.component.html',
  styleUrls: ['./patient-prescriptions.component.scss'],
})
export class PatientPrescriptionsComponent implements OnInit {
  prescriptions: PrescriptionDto[] = [];
  loading = true;

  constructor(
    private readonly prescriptionsApi: PrescriptionsApiService,
    private readonly core: CoreService
  ) {}

  ngOnInit(): void {
    this.loadPrescriptions();
  }

  loadPrescriptions(): void {
    const user = this.core.currentUser();
    if (!user?._id) return;

    this.loading = true;
    this.prescriptionsApi.getPatientPrescriptions(user._id).subscribe({
      next: (data) => {
        this.prescriptions = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load prescriptions', err);
        this.loading = false;
      }
    });
  }

  downloadPDF(p: PrescriptionDto): void {
    const doc = new jsPDF();
    const user = this.core.currentUser();

    // -- Header --
    doc.setFillColor(93, 135, 255); // primary color
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL PRESCRIPTION', 105, 25, { align: 'center' });

    // -- Info Section --
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A';
    doc.text(`Date: ${dateStr}`, 15, 55);
    doc.text(`Patient: ${user?.firstName} ${user?.lastName}`, 15, 62);
    doc.text(`Physician: Dr. ${p.doctorName}`, 15, 69);

    // -- Divider --
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 75, 195, 75);

    // -- Medications --
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Medications:', 15, 85);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    let y = 95;
    
    p.medications.forEach((m, i) => {
      doc.text(`${i + 1}. ${m.name} — ${m.dosage}`, 20, y);
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Frequency: ${m.frequency} | Duration: ${m.duration}`, 25, y + 5);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      y += 15;
    });

    if (p.notes) {
      doc.setFont('helvetica', 'italic');
      doc.text(`Notes: ${p.notes}`, 15, y + 5);
      y += 15;
    }

    // -- Signature --
    if (p.signature) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Physician Signature:', 140, y + 10);
      try {
        doc.addImage(p.signature, 'PNG', 140, y + 15, 50, 20);
      } catch (e) {
        console.error('Could not add signature to PDF', e);
      }
    }

    // -- Footer --
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('This is an electronically generated prescription from MediFollow.', 105, 285, { align: 'center' });

    doc.save(`Prescription_${dateStr.replace(/\//g, '-')}.pdf`);
  }
}
