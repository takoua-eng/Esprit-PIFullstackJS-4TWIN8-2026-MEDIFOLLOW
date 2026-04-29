import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from 'src/app/core/api.config';
import { AuditorReportDialog } from '../auditor-verify/auditor-report.dialog';

interface ReportCard {
  type: 'daily' | 'monthly' | 'suspicious';
  title: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  details: string[];
}

@Component({
  selector: 'app-auditor-reports',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './auditor-reports.component.html',
  styleUrls: ['./auditor-reports.component.scss'],
})
export class AuditorReportsComponent {
  loading: 'daily' | 'monthly' | 'suspicious' | null = null;

  reports: ReportCard[] = [
    {
      type: 'daily',
      title: 'Daily Audit Report',
      description: 'Rapport journalier des événements système, actions critiques et compliance patients du jour.',
      icon: 'report',
      color: '#0984e3',
      bg: '#0984e310',
      details: ['Événements système 24h', 'Actions critiques', 'Compliance patients', 'Top utilisateurs actifs', 'Recommandations IA'],
    },
    {
      type: 'monthly',
      title: 'Monthly Compliance Report',
      description: 'Analyse mensuelle de la compliance patients, activité des coordinateurs et taux de rappels.',
      icon: 'chart-bar',
      color: '#6c5ce7',
      bg: '#6c5ce710',
      details: ['Compliance 30 jours', 'Patients actifs vs inactifs', 'Vitaux & symptômes soumis', 'Rappels envoyés', 'Points forts & faiblesses'],
    },
    {
      type: 'suspicious',
      title: 'Suspicious Activity Report',
      description: 'Détection des comportements anormaux, connexions suspectes et actions à risque sur 7 jours.',
      icon: 'shield-exclamation',
      color: '#d63031',
      bg: '#d6303110',
      details: ['Événements suspects/critiques', 'Utilisateurs multi-IP', 'Suppressions massives', 'Actions anonymes', 'Actions immédiates recommandées'],
    },
  ];

  constructor(private http: HttpClient, private dialog: MatDialog) {}

  generate(type: 'daily' | 'monthly' | 'suspicious'): void {
    this.loading = type;
    this.http.post<any>(`${API_BASE_URL}/ai/audit-report/${type}`, {}).subscribe({
      next: (res) => {
        this.loading = null;
        this.dialog.open(AuditorReportDialog, {
          width: '780px', maxWidth: '96vw',
          data: { ...res, type },
        });
      },
      error: () => { this.loading = null; },
    });
  }
}
