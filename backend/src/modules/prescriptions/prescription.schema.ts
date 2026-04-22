import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PrescriptionDocument = Prescription & Document;

@Schema()
export class Medication {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  dosage: string;

  @Prop({ required: true })
  frequency: string;

  @Prop({ required: true })
  duration: string;
}

const MedicationSchema = SchemaFactory.createForClass(Medication);

@Schema({ timestamps: true })
export class Prescription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ type: [MedicationSchema], required: true })
  medications: Medication[];

  @Prop()
  notes?: string;

  /** Base64 image data of the physician's electronic signature. */
  @Prop({ required: true })
  signature: string;

  @Prop({ default: 'active', enum: ['active', 'archived'] })
  status: string;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
