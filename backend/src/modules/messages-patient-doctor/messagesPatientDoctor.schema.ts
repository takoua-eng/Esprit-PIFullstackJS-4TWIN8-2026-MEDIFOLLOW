import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessagesPatientDoctorDocument = MessagesPatientDoctor & Document;

@Schema({ 
  timestamps: true,
  collection: 'messagesPatientDoctor'
})
export class MessagesPatientDoctor {

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  fromUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  toUserId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const MessagesPatientDoctorSchema =
  SchemaFactory.createForClass(MessagesPatientDoctor);