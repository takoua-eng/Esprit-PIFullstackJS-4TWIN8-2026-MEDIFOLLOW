import { Module } from '@nestjs/common';
import { MessagesPatientDoctorService } from './messages-patient-doctor.service';
import { MessagesPatientDoctorController } from './messages-patient-doctor.controller';
import { MessagesPatientDoctor, MessagesPatientDoctorSchema } from './messagesPatientDoctor.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: MessagesPatientDoctor.name,
        schema: MessagesPatientDoctorSchema,
      },
    ]),
  ],
  providers: [MessagesPatientDoctorService],
  controllers: [MessagesPatientDoctorController]
})
export class MessagesPatientDoctorModule {}
