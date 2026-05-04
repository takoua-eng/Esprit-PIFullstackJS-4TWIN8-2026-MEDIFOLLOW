﻿import { Component, OnInit } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { API_BASE_URL } from 'src/app/core/api.config';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INTERFACES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ReportResult {
  type: string;
  report: { 
    resume: string; 
    problemes: string[]; 
    causes: string[]; 
    recommandations: string[] 
  };
  data?: any;
  generatedAt: string;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONFIGURATION DES TYPES DE RAPPORTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const REPORT_TYPES = [
  { key: 'monthly',      label: 'Rapport mensuel',    icon: 'calendar-stats',  color: '#0984e3', desc: 'Analyse globale du mois en cours' },
  { key: 'risk',         label: 'Patients Ã  risque',  icon: 'alert-triangle',  color: '#d63031', desc: 'Identification des patients Ã  surveiller' },
  { key: 'coordinators', label: 'Coordinateurs',      icon: 'users-group',     color: '#6c5ce7', desc: 'Performance et activité des coordinateurs' },
  { key: 'anomalies',    label: 'Anomalies',          icon: 'chart-bar',       color: '#e17055', desc: 'Patterns anormaux dans les données' },
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// COMPOSANT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@Component({
  selector: 'app-ai-intelligence',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule, TablerIconComponent],
  templateUrl: './ai-intelligence.component.html',
  styleUrls: ['./ai-intelligence.component.scss'],
})
export class AiIntelligenceComponent implements OnInit {

  // â”€â”€ AI Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  reportTypes = REPORT_TYPES;
  loading = false;
  activeType = '';
  result: ReportResult | null = null;
  history: ReportResult[] = [];

  // â”€â”€ Date selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  selectedDate: string = new Date().toISOString().split('T')[0]; // today by default
  readonly today: string = new Date().toISOString().split('T')[0];

  // â”€â”€ LOGO URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  logoUrl = 'assets/images/medifollow-logo.png';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {}

  // â”€â”€ MÉTHODES AI REPORT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  generate(type: string): void {
    this.loading = true;
    this.activeType = type;
    this.result = null;

    this.http.post<ReportResult>(`${API_BASE_URL}/ai/report`, { type, date: this.selectedDate })
      .pipe(catchError(() => of({
        type,
        report: { resume: 'Service AI indisponible.', problemes: [], causes: [], recommandations: [] },
        data: null,
        generatedAt: new Date().toISOString()
      } as ReportResult)))
      .subscribe(res => {
        this.result = res;
        this.history.unshift(res);
        if (this.history.length > 5) this.history.pop();
        this.loading = false;
      });
  }

  getTypeInfo(key: string) {
    return REPORT_TYPES.find(t => t.key === key) ?? REPORT_TYPES[0];
  }

  // â”€â”€ ðŸ“„ EXPORT PDF PROFESSIONNEL (CORRIGÉ) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€ ðŸ“„ EXPORT PDF PROFESSIONNEL (html2canvas - UTF-8 + Logo) â”€â”€
async downloadPDF(): Promise<void> {
  if (!this.result) return;

  const r = this.result.report;
  const d = this.result.data;
  const typeInfo = this.getTypeInfo(this.result.type);
  const dateStr = new Date(this.result.generatedAt).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  // â”€â”€ CRÉER LE TEMPLATE HTML â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const template = document.createElement('div');
  template.style.cssText = `
    width: 210mm;
    min-height: 297mm;
    padding: 15mm 20mm;
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    background: white;
    color: #2d3436;
    box-sizing: border-box;
  `;

  template.innerHTML = `
    <!-- EN-TÃŠTE AVEC LOGO -->
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 25px 30px;
      border-radius: 12px;
      color: white;
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 25px;
    ">
      <!-- LOGO : remplace par ton vrai chemin ou base64 -->
      <img src="${this.logoUrl}" 
           alt="Logo" 
           style="
             width: 65px; 
             height: 65px; 
             background: white; 
             border-radius: 14px; 
             padding: 4px;
             object-fit: contain;
             box-shadow: 0 4px 12px rgba(0,0,0,0.15);
           "
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
      <div style="display:none; width:65px; height:65px; background:rgba(255,255,255,0.2); border-radius:14px; align-items:center; justify-content:center; font-weight:bold; font-size:24px;">ðŸ¥</div>
      
      <div style="flex:1">
        <h1 style="margin:0; font-size:22px; font-weight:700; letter-spacing:0.3px;">
          AI Medical Intelligence
        </h1>
        <p style="margin:6px 0 0; opacity:0.95; font-size:13px;">
          Rapport d'analyse médicale â€” Super Admin
        </p>
        <p style="margin:4px 0 0; opacity:0.85; font-size:11px;">
          ${typeInfo.label} â€¢ Généré le ${dateStr}
        </p>
      </div>
    </div>

    <!-- STATISTIQUES -->
    <div style="
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 30px;
    ">
      <div style="
        background: #f8f9fa;
        padding: 18px 12px;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #667eea;
      ">
        <div style="font-size:26px; font-weight:700; color:#667eea; line-height:1.2;">
          ${d?.totalPatients ?? 0}
        </div>
        <div style="font-size:11px; color:#6c757d; margin-top:4px; font-weight:500;">Patients</div>
      </div>
      <div style="
        background: #f8f9fa;
        padding: 18px 12px;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #00b894;
      ">
        <div style="font-size:26px; font-weight:700; color:#00b894; line-height:1.2;">
          ${d?.complianceToday ?? 0}%
        </div>
        <div style="font-size:11px; color:#6c757d; margin-top:4px; font-weight:500;">Compliance</div>
      </div>
      <div style="
        background: #f8f9fa;
        padding: 18px 12px;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #fdcb6e;
      ">
        <div style="font-size:26px; font-weight:700; color:#e17055; line-height:1.2;">
          ${d?.responseRate ?? 0}%
        </div>
        <div style="font-size:11px; color:#6c757d; margin-top:4px; font-weight:500;">Réponses</div>
      </div>
      <div style="
        background: #f8f9fa;
        padding: 18px 12px;
        border-radius: 10px;
        text-align: center;
        border-left: 4px solid #d63031;
      ">
        <div style="font-size:26px; font-weight:700; color:#d63031; line-height:1.2;">
          ${d?.sentReminders ?? 0}
        </div>
        <div style="font-size:11px; color:#6c757d; margin-top:4px; font-weight:500;">Rappels</div>
      </div>
    </div>

    <!-- RÉSUMÉ -->
    <div style="margin-bottom:28px">
      <h3 style="
        color:#667eea;
        border-bottom:3px solid #667eea;
        padding-bottom:10px;
        font-size:15px;
        margin:0 0 14px;
        font-weight:700;
        display:flex;
        align-items:center;
        gap:8px;
      ">ðŸ“‹ Résumé exécutif</h3>
      <p style="
        line-height:1.75;
        background:#f8f9fa;
        padding:16px 18px;
        border-radius:8px;
        border-left:4px solid #667eea;
        margin:0;
        font-size:13px;
        color:#2d3436;
      ">${r.resume || 'Aucun résumé disponible.'}</p>
    </div>

    <!-- PROBLÃˆMES -->
    ${r.problemes?.length ? `
    <div style="margin-bottom:24px">
      <h3 style="
        color:#d63031;
        border-bottom:3px solid #d63031;
        padding-bottom:10px;
        font-size:15px;
        margin:0 0 14px;
        font-weight:700;
        display:flex;
        align-items:center;
        gap:8px;
      ">âš ï¸ Problèmes identifiés</h3>
      <ul style="list-style:none; padding:0; margin:0;">
        ${r.problemes.map(p => `
          <li style="
            padding:11px 15px;
            margin-bottom:9px;
            background:#fff5f5;
            border-left:3px solid #d63031;
            border-radius:6px;
            font-size:13px;
            line-height:1.6;
            color:#2d3436;
          ">â€¢ ${p}</li>
        `).join('')}
      </ul>
    </div>` : ''}

    <!-- CAUSES -->
    ${r.causes?.length ? `
    <div style="margin-bottom:24px">
      <h3 style="
        color:#e17055;
        border-bottom:3px solid #e17055;
        padding-bottom:10px;
        font-size:15px;
        margin:0 0 14px;
        font-weight:700;
        display:flex;
        align-items:center;
        gap:8px;
      ">ðŸ” Causes racines</h3>
      <ul style="list-style:none; padding:0; margin:0;">
        ${r.causes.map(c => `
          <li style="
            padding:11px 15px;
            margin-bottom:9px;
            background:#fff9f5;
            border-left:3px solid #e17055;
            border-radius:6px;
            font-size:13px;
            line-height:1.6;
            color:#2d3436;
          ">â€¢ ${c}</li>
        `).join('')}
      </ul>
    </div>` : ''}

    <!-- RECOMMANDATIONS -->
    ${r.recommandations?.length ? `
    <div style="margin-bottom:24px">
      <h3 style="
        color:#00b894;
        border-bottom:3px solid #00b894;
        padding-bottom:10px;
        font-size:15px;
        margin:0 0 14px;
        font-weight:700;
        display:flex;
        align-items:center;
        gap:8px;
      ">ðŸ’¡ Recommandations</h3>
      <ul style="list-style:none; padding:0; margin:0;">
        ${r.recommandations.map(rec => `
          <li style="
            padding:11px 15px;
            margin-bottom:9px;
            background:#f0fff4;
            border-left:3px solid #00b894;
            border-radius:6px;
            font-size:13px;
            line-height:1.6;
            color:#2d3436;
          ">â€¢ ${rec}</li>
        `).join('')}
      </ul>
    </div>` : ''}

    <!-- PIED DE PAGE -->
    <div style="
      margin-top:45px;
      padding-top:22px;
      border-top:2px solid #e9ecef;
      text-align:center;
      font-size:11px;
      color:#6c757d;
      line-height:1.8;
    ">
      <strong style="color:#667eea">AI Medical Intelligence</strong><br>
      Document généré automatiquement â€¢ Confidentiel â€¢ Usage interne uniquement<br>
      <span style="opacity:0.7">MediFlow Â© ${new Date().getFullYear()}</span>
    </div>
  `;

  // â”€â”€ RENDU HORS ÉCRAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  template.style.position = 'absolute';
  template.style.left = '-9999px';
  template.style.top = '0';
  template.style.zIndex = '-1';
  document.body.appendChild(template);

  // Attendre que le DOM soit prÃªt
  await new Promise(resolve => setTimeout(resolve, 250));

  try {
    // â”€â”€ CAPTURE EN CANVAS HAUTE QUALITÉ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const canvas = await html2canvas(template, {
      scale: 3,                    // Haute résolution
      useCORS: true,               // Autoriser images externes
      backgroundColor: '#ffffff',  // Fond blanc garanti
      logging: false,
      width: template.offsetWidth,
      height: template.offsetHeight,
      windowWidth: template.offsetWidth + 400,
      windowHeight: template.offsetHeight + 400
    });

    const imgData = canvas.toDataURL('image/png');
    
    // â”€â”€ CRÉATION PDF â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Ajouter l'image au PDF
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    // â”€â”€ SAUVEGARDE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const fileName = `rapport-${this.result.type}-${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);

  } catch (error) {
    console.error('âŒ Erreur génération PDF:', error);
    alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
  } finally {
    // Nettoyer le template temporaire
    if (template.parentNode) {
      document.body.removeChild(template);
    }
  }
}
}