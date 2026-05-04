import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vital, VitalSchema } from './vital.schema';
import { User, UserSchema } from '../users/users.schema';
import { Role, RoleSchema } from '../roles/role.schema';
import { VitalsService } from './vitals.service';
import { VitalsController } from './vitals.controller';
import { RemindersModule } from '../reminders/reminders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vital.name, schema: VitalSchema },
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    RemindersModule,
  ],
  controllers: [VitalsController],
  providers: [VitalsService],
  exports: [VitalsService],
})
export class VitalsModule {}
