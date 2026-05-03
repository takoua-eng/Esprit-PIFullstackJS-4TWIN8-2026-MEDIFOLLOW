﻿import { Component, Inject } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { AuditLog } from 'src/app/services/audit.service';

@Component({
  selector: 'app-auditor-log-detail',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, TablerIconComponent],
  template: `
    <div class="ad-wrap">
      <div class="ad-header">
        <div class="ad-header-icon"><i-tabler name="shield-check" class="icon-20"></i-tabler></div>
        <div>
          <div class="ad-title">Détail de l'événement</div>
          <div class="ad-sub">{{ log.createdAt | date:'dd/MM/yyyy Ã  HH:mm:ss' }}</div>
        </div>
        <button mat-icon-button (click)="close()" class="ad-close">
          <i-tabler name="x" class="icon-16"></i-tabler>
        </button>
      </div>

      <mat-dialog-content class="ad-content">

        <div class="ad-row-2">
          <!-- WHO -->
          <div class="ad-section">
            <div class="ad-section-title"><i-tabler name="user-circle" class="icon-13"></i-tabler> QUI</div>
            <div class="ad-user-card">
              <div class="ad-avatar" [style.background]="roleColor(log.userRole)">
                {{ (log.userEmail || '?')[0].toUpperCase() }}
              </div>
              <div>
                <div class="ad-user-name">{{ log.userName || log.userEmail }}</div>
                <div class="ad-user-email">{{ log.userEmail }}</div>
                <span class="ad-role-badge" [style.background]="roleColor(log.userRole) + '18'" [style.color]="roleColor(log.userRole)">
                  {{ log.userRole || 'unknown' }}
                </span>
              </div>
            </div>
            <div class="ad-field"><span class="ad-lbl">User ID</span><span class="ad-mono">{{ log.userId }}</span></div>
          </div>

          <!-- WHAT -->
          <div class="ad-section">
            <div class="ad-section-title"><i-tabler name="activity" class="icon-13"></i-tabler> QUOI</div>
            <div class="ad-action-big" [style.background]="actionColor(log.action) + '15'" [style.color]="actionColor(log.action)">
              <i-tabler [name]="actionIcon(log.action)" class="icon-18"></i-tabler>
              <span>{{ log.action }}</span>
            </div>
            <div class="ad-field m-t-10">
              <span class="ad-lbl">Ressource</span><span class="ad-mono">{{ log.entityType }}</span>
            </div>
            <div class="ad-field">
              <span class="ad-lbl">Entity ID</span><span class="ad-mono">{{ log.entityId }}</span>
            </div>
          </div>
        </div>

        <!-- WHERE -->
        <div class="ad-section m-t-12">
          <div class="ad-section-title"><i-tabler name="map-pin" class="icon-13"></i-tabler> OÃ™</div>
          <div class="ad-row-2">
            <div class="ad-field">
              <span class="ad-lbl">IP Address</span>
              <span class="ad-mono ip-chip">{{ log.ipAddress || 'â€”' }}</span>
            </div>
            <div class="ad-field">
              <span class="ad-lbl">Navigateur</span>
              <span class="ad-ua">{{ parseUA(log.userAgent) }}</span>
            </div>
          </div>
        </div>

        <!-- DIFF BEFORE / AFTER -->
        <div class="ad-section m-t-12" *ngIf="log.after || log.before">
          <div class="ad-section-title"><i-tabler name="git-diff" class="icon-13"></i-tabler> CHANGEMENTS AVANT / APRÃˆS</div>

          <!-- Diff visuel -->
          <div *ngIf="log.before && log.after" class="diff-grid">
            <div class="diff-col before">
              <div class="diff-label"><i-tabler name="circle-minus" class="icon-12"></i-tabler> Avant</div>
              <div *ngFor="let key of diffKeys()" class="diff-row">
                <span class="diff-key">{{ key }}</span>
                <span class="diff-val before-val">{{ getVal(log.before, key) }}</span>
              </div>
            </div>
            <div class="diff-arrow"><i-tabler name="arrow-right" class="icon-16" style="color:#ccc"></i-tabler></div>
            <div class="diff-col after">
              <div class="diff-label"><i-tabler name="circle-plus" class="icon-12"></i-tabler> Après</div>
              <div *ngFor="let key of diffKeys()" class="diff-row">
                <span class="diff-key">{{ key }}</span>
                <span class="diff-val after-val" [class.changed]="hasChanged(key)">{{ getVal(log.after, key) }}</span>
              </div>
            </div>
          </div>

          <!-- Seulement after (CREATE) -->
          <div *ngIf="!log.before && log.after">
            <div class="json-label"><i-tabler name="circle-plus" class="icon-12" style="color:#00b894"></i-tabler> Données créées</div>
            <pre class="json-block">{{ log.after | json }}</pre>
          </div>

          <!-- Seulement before (DELETE) -->
          <div *ngIf="log.before && !log.after">
            <div class="json-label"><i-tabler name="circle-minus" class="icon-12" style="color:#d63031"></i-tabler> Données supprimées</div>
            <pre class="json-block">{{ log.before | json }}</pre>
          </div>
        </div>

        <div *ngIf="!log.after && !log.before" class="no-changes">
          <i-tabler name="info-circle" class="icon-15" style="color:#ccc"></i-tabler>
          Aucune donnée before/after pour cet événement
        </div>

      </mat-dialog-content>

      <mat-dialog-actions align="end" class="ad-actions">
        <button mat-stroked-button (click)="close()">Fermer</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .ad-wrap { min-width: 560px; max-width: 700px; }
    .ad-header {
      display:flex; align-items:center; gap:12px;
      padding:16px 20px 12px; border-bottom:1px solid #f0f0f0;
    }
    .ad-header-icon {
      width:40px; height:40px; border-radius:10px;
      background:linear-gradient(135deg,#6c5ce7,#a29bfe);
      color:#fff; display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .ad-title { font-size:.9rem; font-weight:700; color:#1a1a2e; }
    .ad-sub   { font-size:.72rem; color:#aaa; margin-top:2px; }
    .ad-close { margin-left:auto; color:#aaa !important; }
    .ad-content { padding:14px 20px !important; max-height:68vh; overflow-y:auto; }
    .ad-section {
      background:#fafafa; border:1px solid #f0f0f0;
      border-radius:10px; padding:12px 14px;
    }
    .ad-section-title {
      display:flex; align-items:center; gap:5px;
      font-size:.68rem; font-weight:700; text-transform:uppercase;
      letter-spacing:.8px; color:#888; margin-bottom:10px;
    }
    .ad-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .ad-user-card { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .ad-avatar {
      width:34px; height:34px; border-radius:50%;
      color:#fff; font-size:.78rem; font-weight:700;
      display:flex; align-items:center; justify-content:center; flex-shrink:0;
    }
    .ad-user-name  { font-size:.82rem; font-weight:600; color:#333; }
    .ad-user-email { font-size:.72rem; color:#888; }
    .ad-role-badge {
      display:inline-block; margin-top:3px;
      font-size:.65rem; font-weight:700; padding:1px 8px; border-radius:10px;
    }
    .ad-field { display:flex; align-items:center; gap:8px; margin-bottom:5px; }
    .ad-lbl   { min-width:80px; font-size:.72rem; font-weight:600; color:#aaa; }
    .ad-mono  { font-family:monospace; font-size:.72rem; color:#444; }
    .ip-chip  { background:#f0f4f8; padding:2px 7px; border-radius:4px; }
    .ad-ua    { font-size:.7rem; color:#666; word-break:break-all; }
    .ad-action-big {
      display:inline-flex; align-items:center; gap:8px;
      padding:7px 14px; border-radius:10px;
      font-size:.82rem; font-weight:700; text-transform:uppercase;
    }
    .diff-grid { display:flex; align-items:flex-start; gap:8px; margin-top:4px; }
    .diff-col  { flex:1; }
    .diff-arrow { padding-top:26px; flex-shrink:0; }
    .diff-label {
      display:flex; align-items:center; gap:4px;
      font-size:.68rem; font-weight:700; text-transform:uppercase;
      letter-spacing:.5px; margin-bottom:6px;
    }
    .diff-col.before .diff-label { color:#d63031; }
    .diff-col.after  .diff-label { color:#00b894; }
    .diff-row { display:flex; gap:6px; margin-bottom:4px; align-items:flex-start; }
    .diff-key { font-size:.7rem; font-weight:600; color:#888; min-width:80px; }
    .diff-val { font-family:monospace; font-size:.7rem; padding:2px 6px; border-radius:4px; word-break:break-all; }
    .before-val { background:#fff5f5; color:#d63031; }
    .after-val  { background:#f0fff4; color:#00b894; }
    .after-val.changed { font-weight:700; }
    .json-label { display:flex; align-items:center; gap:4px; font-size:.7rem; font-weight:700; color:#888; margin-bottom:5px; }
    .json-block {
      background:#1e1e1e; color:#d4d4d4; padding:10px; border-radius:8px;
      font-size:.68rem; max-height:150px; overflow:auto; white-space:pre-wrap; margin:0;
    }
    .no-changes { display:flex; align-items:center; gap:6px; font-size:.78rem; color:#bbb; padding:8px 0; }
    .ad-actions { padding:10px 20px !important; border-top:1px solid #f0f0f0; }
  `],
})
export class AuditorLogDetailDialog {
  log: AuditLog;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AuditLog,
    private ref: MatDialogRef<AuditorLogDetailDialog>,
  ) { this.log = data; }

  close(): void { this.ref.close(); }

  diffKeys(): string[] {
    const keys = new Set([...Object.keys(this.log.before || {}), ...Object.keys(this.log.after || {})]);
    ['__v','createdAt','updatedAt','_id','password'].forEach(k => keys.delete(k));
    return Array.from(keys);
  }
  getVal(obj: any, key: string): string {
    if (!obj) return 'â€”';
    const v = obj[key];
    if (v === undefined || v === null) return 'â€”';
    if (typeof v === 'object') return JSON.stringify(v).slice(0, 50);
    return String(v);
  }
  hasChanged(key: string): boolean { return this.getVal(this.log.before, key) !== this.getVal(this.log.after, key); }
  parseUA(ua: string): string {
    if (!ua || ua === 'unknown') return 'â€”';
    if (ua.includes('Chrome'))  return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari'))  return 'Safari';
    if (ua.includes('Edge'))    return 'Edge';
    return ua.slice(0, 40);
  }
  roleColor(role: string): string {
    return ({ 'super-admin':'#6c5ce7', admin:'#0984e3', doctor:'#00b894',
              nurse:'#00cec9', coordinator:'#e17055', auditor:'#a29bfe', patient:'#fdcb6e' } as any)[role?.toLowerCase()] ?? '#b2bec3';
  }
  actionColor(a: string): string {
    return ({ CREATE:'#00b894', UPDATE:'#0984e3', DELETE:'#d63031', LOGIN:'#6c5ce7',
              LOGOUT:'#a29bfe', VIEW:'#b2bec3', ACTIVATE:'#00cec9', DEACTIVATE:'#e17055' } as any)[a] ?? '#636e72';
  }
  actionIcon(a: string): string {
    return ({ CREATE:'circle-plus', UPDATE:'edit', DELETE:'trash', LOGIN:'login',
              LOGOUT:'logout', VIEW:'eye', ACTIVATE:'toggle-right', DEACTIVATE:'toggle-left' } as any)[a] ?? 'activity';
  }
}
