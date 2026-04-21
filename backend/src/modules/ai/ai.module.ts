import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Schema } from 'mongoose';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { User, UserSchema } from '../users/users.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { Reminder, ReminderSchema } from '../coordinator/reminder.schema';
import { AuditLog, AuditLogSchema } from '../audit/entities/audit.schema';

const VitalSchema   = new Schema({}, { strict: false, collection: 'vitalparameters' });
const SymptomSchema = new Schema({}, { strict: false, collection: 'symptoms' });

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: 'AiUser',     schema: UserSchema,     collection: 'users' },
      { name: 'AiRole',     schema: RoleSchema,     collection: 'roles' },
      { name: 'AiReminder', schema: ReminderSchema, collection: 'reminders' },
      { name: 'AiVital',    schema: VitalSchema },
      { name: 'AiSymptom',  schema: SymptomSchema },
      { name: 'AiAuditLog', schema: AuditLogSchema, collection: 'auditlogs' },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
