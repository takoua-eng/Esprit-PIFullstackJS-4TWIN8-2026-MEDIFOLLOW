import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ReportData {
  type: 'daily' | 'monthly' | 'suspicious';
  report: any;
  data: any;
  generatedAt: string;
}

@Component({
  selector: 'app-auditor-report-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  template: `
    <div class="rpt-dialog">
      <!-- Header -->
      <div class="rpt-header" [style.background]="headerBg">
        <div class="rpt-header-left">
          <i-tabler [name]="headerIcon" class="icon-22" style="color:#fff"></i-tabler>
          <div>
            <div class="rpt-title">{{ report.title }}</div>
            <div class="rpt-date">Généré le {{ data.generatedAt | date:'dd/MM/yyyy à HH:mm' }}</div>
          </div>
        </div>
        <button mat-icon-button (click)="close()" style="color:#fff">
          <i-tabler name="x" class="icon-18"></i-tabler>
        </button>
      </div>

      <div class="rpt-body">

        <!-- KPIs row -->
        <div class="rpt-kpis" *ngIf="data.type === 'daily'">
          <div class="rpt-kpi" style="--c:#6c5ce7">
            <div class="rpt-kpi-val">{{ report.totalEvents }}</div>
            <div class="rpt-kpi-lbl">Événements</div>
          </div>
          <div class="rpt-kpi" style="--c:#d63031">
            <div class="rpt-kpi-val">{{ report.criticalCount }}</div>
            <div class="rpt-kpi-lbl">Critiques</div>
          </div>
          <div class="rpt-kpi" [style.--c]="report.complianceRate >= 70 ? '#00b894' : '#fdcb6e'">
            <div class="rpt-kpi-val">{{ report.complianceRate }}%</div>
            <div class="rpt-kpi-lbl">Compliance</div>
          </div>
        </div>

        <div class="rpt-kpis" *ngIf="data.type === 'monthly'">
          <div class="rpt-kpi" [style.--c]="report.kpis?.complianceRate >= 70 ? '#00b894' : '#fdcb6e'">
            <div class="rpt-kpi-val">{{ report.kpis?.complianceRate }}%</div>
            <div class="rpt-kpi-lbl">Compliance</div>
          </div>
          <div class="rpt-kpi" style="--c:#0984e3">
            <div class="rpt-kpi-val">{{ report.kpis?.activePatients }}</div>
            <div class="rpt-kpi-lbl">Patients actifs</div>
          </div>
          <div class="rpt-kpi" style="--c:#00b894">
            <div class="rpt-kpi-val">{{ report.kpis?.remindersSent }}</div>
            <div class="rpt-kpi-lbl">Rappels envoyés</div>
          </div>
        </div>

        <div class="rpt-kpis" *ngIf="data.type === 'suspicious'">
          <div class="rpt-kpi" [style.--c]="report.riskLevel === 'HIGH' ? '#d63031' : report.riskLevel === 'MEDIUM' ? '#fdcb6e' : '#00b894'">
            <div class="rpt-kpi-val">{{ report.riskLevel }}</div>
            <div class="rpt-kpi-lbl">Niveau risque</div>
          </div>
          <div class="rpt-kpi" style="--c:#d63031">
            <div class="rpt-kpi-val">{{ data.data?.suspiciousCount }}</div>
            <div class="rpt-kpi-lbl">Événements suspects</div>
          </div>
          <div class="rpt-kpi" style="--c:#e17055">
            <div class="rpt-kpi-val">{{ data.data?.criticalCount24h }}</div>
            <div class="rpt-kpi-lbl">Critiques 24h</div>
          </div>
        </div>

        <!-- Summary -->
        <div class="rpt-section" *ngIf="report.summary || report.executiveSummary">
          <div class="rpt-section-title">📋 Résumé</div>
          <p class="rpt-text">{{ report.summary || report.executiveSummary }}</p>
        </div>

        <!-- Compliance Analysis (monthly) -->
        <div class="rpt-section" *ngIf="report.complianceAnalysis">
          <div class="rpt-section-title">📊 Analyse de compliance</div>
          <p class="rpt-text">{{ report.complianceAnalysis }}</p>
        </div>

        <!-- Lists grid -->
        <div class="rpt-grid">
          <div class="rpt-list-card green" *ngIf="report.highlights?.length || report.strengths?.length">
            <div class="rpt-list-title">✅ {{ data.type === 'monthly' ? 'Points forts' : 'Points positifs' }}</div>
            <ul><li *ngFor="let i of (report.highlights || report.strengths)">{{ i }}</li></ul>
          </div>
          <div class="rpt-list-card red" *ngIf="report.concerns?.length || report.weaknesses?.length || report.threats?.length">
            <div class="rpt-list-title">⚠️ {{ data.type === 'suspicious' ? 'Menaces' : 'Points d\'attention' }}</div>
            <ul><li *ngFor="let i of (report.concerns || report.weaknesses || report.threats)">{{ i }}</li></ul>
          </div>
          <div class="rpt-list-card purple" *ngIf="report.suspiciousUsers?.length">
            <div class="rpt-list-title">👤 Utilisateurs suspects</div>
            <ul><li *ngFor="let i of report.suspiciousUsers">{{ i }}</li></ul>
          </div>
          <div class="rpt-list-card orange" *ngIf="report.immediateActions?.length">
            <div class="rpt-list-title">🚨 Actions immédiates</div>
            <ul><li *ngFor="let i of report.immediateActions">{{ i }}</li></ul>
          </div>
          <div class="rpt-list-card blue" *ngIf="report.recommendations?.length">
            <div class="rpt-list-title">💡 Recommandations</div>
            <ul><li *ngFor="let i of report.recommendations">{{ i }}</li></ul>
          </div>
        </div>

        <!-- Interpretation -->
        <div class="rpt-interp" *ngIf="report.interpretation">
          <div class="rpt-section-title">📌 Interprétation</div>
          <p class="rpt-text">{{ report.interpretation }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="rpt-footer">
        <button mat-stroked-button (click)="printReport()">
          <i-tabler name="printer" class="icon-15 m-r-6"></i-tabler> Imprimer
        </button>
        <button mat-raised-button color="primary" (click)="close()">Fermer</button>
      </div>
    </div>
  `,
  styles: [`
    .rpt-dialog { display:flex; flex-direction:column; max-height:85vh; }
    .rpt-header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-radius:12px 12px 0 0; }
    .rpt-header-left { display:flex; align-items:center; gap:12px; }
    .rpt-title { font-size:15px; font-weight:700; color:#fff; }
    .rpt-date { font-size:11px; color:rgba(255,255,255,.75); margin-top:2px; }
    .rpt-body { flex:1; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:16px; }
    .rpt-kpis { display:flex; gap:12px; }
    .rpt-kpi { flex:1; background:color-mix(in srgb, var(--c) 10%, white); border:1px solid color-mix(in srgb, var(--c) 20%, white); border-radius:10px; padding:12px; text-align:center; }
    .rpt-kpi-val { font-size:22px; font-weight:700; color:var(--c); }
    .rpt-kpi-lbl { font-size:11px; color:#636e72; margin-top:2px; }
    .rpt-section-title { font-size:13px; font-weight:700; color:#2d3436; margin-bottom:6px; }
    .rpt-text { font-size:13px; color:#636e72; line-height:1.7; margin:0; }
    .rpt-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .rpt-list-card { border-radius:10px; padding:12px; }
    .rpt-list-card.green { background:#00b89410; border:1px solid #00b89430; }
    .rpt-list-card.red   { background:#d6303110; border:1px solid #d6303130; }
    .rpt-list-card.blue  { background:#0984e310; border:1px solid #0984e330; }
    .rpt-list-card.purple{ background:#6c5ce710; border:1px solid #6c5ce730; }
    .rpt-list-card.orange{ background:#e1705510; border:1px solid #e1705530; }
    .rpt-list-title { font-size:12px; font-weight:700; margin-bottom:8px; }
    .rpt-list-card.green .rpt-list-title  { color:#00b894; }
    .rpt-list-card.red .rpt-list-title    { color:#d63031; }
    .rpt-list-card.blue .rpt-list-title   { color:#0984e3; }
    .rpt-list-card.purple .rpt-list-title { color:#6c5ce7; }
    .rpt-list-card.orange .rpt-list-title { color:#e17055; }
    ul { margin:0; padding-left:16px; }
    li { font-size:12px; color:#636e72; margin-bottom:4px; line-height:1.5; }
    .rpt-interp { background:#f0f4ff; border-left:3px solid #6c5ce7; border-radius:0 10px 10px 0; padding:12px; }
    .rpt-footer { display:flex; justify-content:flex-end; gap:8px; padding:12px 20px; border-top:1px solid #f1f3f5; }
    @media print { .rpt-footer { display:none; } }
  `],
})
export class AuditorReportDialog {
  report: any;
  data: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public dialogData: ReportData,
    private dialogRef: MatDialogRef<AuditorReportDialog>,
  ) {
    this.report = dialogData.report;
    this.data   = dialogData;
  }

  get headerBg(): string {
    if (this.data.type === 'suspicious') return '#d63031';
    if (this.data.type === 'monthly')    return '#6c5ce7';
    return '#0984e3';
  }

  get headerIcon(): string {
    if (this.data.type === 'suspicious') return 'shield-exclamation';
    if (this.data.type === 'monthly')    return 'chart-bar';
    return 'report';
  }

  close() { this.dialogRef.close(); }

  printReport() { window.print(); }
}
