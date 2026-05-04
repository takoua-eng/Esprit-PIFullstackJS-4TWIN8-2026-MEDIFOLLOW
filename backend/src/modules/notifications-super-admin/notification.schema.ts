import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type NotificationDocument = Notification & Document;

export type NotifType =
  | 'PATIENT_ASSIGNED'
  | 'WELCOME'
  | 'GENERAL';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.Mixed, required: true })
  userId: Types.ObjectId | string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: String, default: 'GENERAL', enum: ['PATIENT_ASSIGNED', 'WELCOME', 'GENERAL'] })
  type: NotifType;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  relatedUserId?: Types.ObjectId;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);