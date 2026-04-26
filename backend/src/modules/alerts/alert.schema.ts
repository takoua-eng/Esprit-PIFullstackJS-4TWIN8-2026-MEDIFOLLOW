import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AlertDocument = Alert & Document;

/** Same collection as Compass: `test` DB → `alerts` (DB name comes from `MONGODB_DB_NAME`). */
@Schema({ timestamps: true, collection: 'alerts' })
export class Alert {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredBy?: Types.ObjectId;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  severity!: string;

  @Prop()
  parameter?: string;

  @Prop()
  value?: number;

  @Prop()
  threshold?: number;

  /** Links to the clinical queue row (symptom or vital document id). */
  @Prop()
  sourceType?: string;

  @Prop({ type: Types.ObjectId })
  sourceId?: Types.ObjectId;

  @Prop({ required: true })
  message!: string;

  @Prop({ default: 'open' })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  acknowledgedBy?: Types.ObjectId;

  @Prop()
  acknowledgedAt?: Date;

  /** Set when a nurse marks the alert as seen. */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  seenBy?: Types.ObjectId;

  @Prop()
  seenAt?: Date;

  /** Set when a nurse marks the alert as reported (escalated). */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  reportedBy?: Types.ObjectId;

  @Prop()
  reportedAt?: Date;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);
