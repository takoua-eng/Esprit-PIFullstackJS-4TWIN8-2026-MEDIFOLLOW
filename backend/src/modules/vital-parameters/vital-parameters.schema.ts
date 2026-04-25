// src/modules/patient/schemas/vital_parameters.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VitalParametersDocument = VitalParameters & Document;

@Schema({ timestamps: true, collection: 'vitalparameters' })
export class VitalParameters {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId; // patient concerné

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy!: Types.ObjectId; // self, nurse ou physician

  @Prop()
  temperature?: number; // en °C, optionnel

  @Prop()
  bloodPressuresystolic?: number; // mmHg (legacy key)

  /** Standard camelCase — some documents / Compass use this key instead of `bloodPressuresystolic`. */
  @Prop()
  bloodPressureSystolic?: number;

  @Prop()
  bloodPressureDiastolic?: number; // mmHg, optionnel

  @Prop()
  weight?: number; // kg, optionnel

  @Prop()
  heartRate?: number; // bpm, optionnel

  @Prop()
  notes?: string; // texte libre, optionnel

  @Prop({ required: true })
  recordedAt!: Date; // date de mesure

  @Prop()
  glucoseLevel?: number; // g/L (frontend sends glucoseLevel in g/L)

  @Prop()
  bloodGlucose?: number; // mg/dL

  @Prop()
  oxygenSaturation?: number; // SpO2 en %, normal >= 95, critique < 90

  @Prop()
  respiratoryRate?: number; // fréquence respiratoire en resp/min, normale 12-20, critique > 30 ou < 8

  //mongoose gere automatiquement createdAt et updatedAt grace a timestamps: true dans le decorateur @Schema
}

export const VitalParametersSchema = SchemaFactory.createForClass(VitalParameters);