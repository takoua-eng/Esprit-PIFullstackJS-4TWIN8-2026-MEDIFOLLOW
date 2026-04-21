import { Component, OnInit, OnDestroy } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { PatientService, AlertEntry } from 'src/app/services/patient.service';
import { VoiceAssistantService } from 'src/app/services/voice-assistant.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-alerts',
  imports: [MaterialModule, CommonModule],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
})
export class AlertsComponent implements OnInit, OnDestroy {
  openAlerts: AlertEntry[] = [];
  historyAlerts: AlertEntry[] = [];
  isLoading = true;

  constructor(
    private patientService: PatientService,
    private va: VoiceAssistantService,
  ) {}

  ngOnInit() {
    const patientId = this.patientService.getCurrentPatientId();
    if (!patientId) {
      this.openAlerts = [];
      this.historyAlerts = [];
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    forkJoin({
      open: this.patientService.getPatientAlerts(patientId, 'open'),
      history: this.patientService.getPatientAlerts(patientId, 'acknowledged'),
    }).subscribe({
      next: ({ open, history }) => {
        this.openAlerts = open || [];
        this.historyAlerts = history || [];
        this.isLoading = false;

        if (this.va.isEnabled$.value) {
          setTimeout(() => this.va.readAlerts(
            this.openAlerts.map(a => ({ message: a.message, status: a.status }))
          ), 600);
        }
      },
      error: () => { this.isLoading = false; },
    });
  }

  ngOnDestroy(): void {
    this.va.unregisterForm();
  }



  
  resolve(alertId: string) {
  const idx = this.openAlerts.findIndex(a => a._id === alertId);
  if (idx === -1) return;

  // Optimistic UI: on change status pour montrer le bouton vert
  const original = { ...this.openAlerts[idx] };
  this.openAlerts[idx] = { ...original, status: 'acknowledged' };

  // Appel backend
  this.patientService.acknowledgeClinicalAlert(alertId).subscribe({
    next: (updatedAlert) => {
      // retirer de openAlerts
      this.openAlerts.splice(idx, 1);
      // ajouter dans historyAlerts
      this.historyAlerts.unshift(updatedAlert);
    },
    error: () => {
      // revert si erreur
      const found = this.openAlerts.find(a => a._id === alertId);
      if (found) Object.assign(found, original);
    }
  });
}
}
