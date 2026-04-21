import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true })
  userId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  phone: string;

  @Prop({ enum: ['male', 'female'] })
  gender: string;

  @Prop()
  address: string;

  @Prop()
  photo: string;

  // ── ROLE ─────────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  role: Types.ObjectId;

  // ── CARE TEAM RELATIONS ───────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'User' })
  doctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  nurseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  coordinatorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedDoctor: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedNurse: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedCoordinator: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Service' })
  assignedService: Types.ObjectId;

  // ── PATIENT ──────────────────────────────────────────────
  @Prop()
  dateOfBirth: Date;

  @Prop()
  medicalRecordNumber: string;

  @Prop()
  emergencyContact: string;

  @Prop()
  insuranceProvider: string;

  @Prop()
  insuranceNumber: string;

  @Prop()
  nationalId: string;

  @Prop()
  age: number;


  // ── DOCTOR ───────────────────────────────────────────────
  @Prop()
  specialization: string;

  @Prop()
  licenseNumber: string;

  @Prop()
  yearsOfExperience: number;

  // ── NURSE ────────────────────────────────────────────────
  @Prop()
  department: string;

  @Prop()
  shift: string;


  // ── COORDINATOR ──────────────────────────────────────────
  @Prop()
  responsibilities: string;

  // ── ADMIN ────────────────────────────────────────────────
  @Prop({ default: false })
  isSuperAdmin: boolean;

  @Prop()
  adminLevel: string;

  // ── AUDITOR ──────────────────────────────────────────────
  @Prop()
  auditLevel: string;

  // ── COMMON ───────────────────────────────────────────────
  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: mongoose.Schema.Types.Mixed, ref: 'Service', default: undefined })
  serviceId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  // ── ASSIGNED PATIENTS (coordinator/doctor/nurse) ──────────
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  assignedPatients: mongoose.Types.ObjectId[];

  // ── NURSE DOSSIER ─────────────────────────────────────────
  @Prop({ type: mongoose.Schema.Types.Mixed })
  nurseDossier?: Record<string, unknown>;

  // ── FACE RECOGNITION ─────────────────────────────────────
  @Prop({ type: [Number], default: [] })
  faceDescriptor: number[];
  // ── RESET PASSWORD ───────────────────────────────────────
  @Prop()
  resetToken: string;

  @Prop()
  resetTokenExpiry: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Clean invalid serviceId before any populate can fail
UserSchema.pre(['find', 'findOne', 'findOneAndUpdate'], function () {
  const filter = (this as any).getFilter?.() ?? {};
  if (filter.serviceId && !require('mongoose').Types.ObjectId.isValid(filter.serviceId)) {
    (this as any).setQuery({ ...filter, serviceId: undefined });
  }
});
