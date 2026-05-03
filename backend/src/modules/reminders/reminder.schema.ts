import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;

@Schema({ timestamps: true })
export class Reminder {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  patientId: Types.ObjectId;

  /** Staff who scheduled/sent the reminder (e.g. nurse or coordinator). */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  sentBy?: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  message: string;

  /** pending | sent | answered | missed | failed | completed | cancelled */
  @Prop({ default: 'pending', enum: ['pending', 'sent', 'answered', 'missed', 'failed', 'completed', 'cancelled'] })
  status: string;

  @Prop()
  scheduledAt?: Date;

  @Prop()
  sentAt?: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
