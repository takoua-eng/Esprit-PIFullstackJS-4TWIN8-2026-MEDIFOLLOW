import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Reminder, ReminderSchema } from './reminder.schema';
import { User, UserSchema } from '../users/users.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { Symptoms, SymptomsSchema } from '../symptoms/symptoms.schema';
import { VitalParameters, VitalParametersSchema } from '../vital-parameters/vital-parameters.schema';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reminder.name, schema: ReminderSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Symptoms.name, schema: SymptomsSchema },
      { name: VitalParameters.name, schema: VitalParametersSchema },
    ]),
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
