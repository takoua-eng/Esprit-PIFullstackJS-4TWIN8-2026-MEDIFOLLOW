import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { CoordinatorController } from './coordinator.controller';
import { CoordinatorService } from './coordinator.service';
import { CoordinatorSchedulerService } from './coordinator-scheduler.service';
import { User, UserSchema } from '../users/users.schema';
import { Reminder, ReminderSchema } from './reminder.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Schema } from 'mongoose';

const VitalParameterSchema = new Schema({}, { strict: false, collection: 'vitalparameters' });
const SymptomSchema = new Schema({}, { strict: false, collection: 'symptoms' });

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Reminder.name, schema: ReminderSchema },
      { name: Role.name, schema: RoleSchema },
      { name: 'VitalParameter', schema: VitalParameterSchema },
      { name: 'Symptom', schema: SymptomSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [CoordinatorController],
  providers: [CoordinatorService, CoordinatorSchedulerService],
})
export class CoordinatorModule {}
