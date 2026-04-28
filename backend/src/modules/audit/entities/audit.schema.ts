import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  // ── 1. ESSENTIELS ─────────────────────────────────────────────
  @Prop() userId:     string;
  @Prop() userEmail:  string;
  @Prop() userRole:   string;   // Admin, Doctor, Nurse...
  @Prop() userName:   string;   // firstName + lastName

  @Prop() action:     string;   // CREATE, UPDATE, DELETE, LOGIN...
  @Prop() entityType: string;   // PATIENTS, VITALS, AUTH...
  @Prop() entityId:   string;

  // ── 2. TRAÇABILITÉ ────────────────────────────────────────────
  @Prop({ type: Object }) before: any;   // old_value
  @Prop({ type: Object }) after:  any;   // new_value

  // ── 3. SÉCURITÉ ───────────────────────────────────────────────
  @Prop({ default: 'SUCCESS' }) status: 'SUCCESS' | 'FAILED';
  @Prop() ipAddress:  string;
  @Prop() userAgent:  string;   // device_info (browser/OS)

  // ── 4. ANALYSE ────────────────────────────────────────────────
  @Prop({ default: 'NORMAL' }) riskLevel: 'NORMAL' | 'SUSPICIOUS' | 'CRITICAL';
  @Prop({ default: 0 })        loginAttempts: number;
  @Prop()                      sessionId: string;

  // ── 5. CONTEXTE ───────────────────────────────────────────────
  @Prop() description: string;  // "Updated patient heart rate"
  @Prop() module:      string;  // Auth, Patients, Alerts, Services...
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ userEmail: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ riskLevel: 1 });
AuditLogSchema.index({ module: 1 });
