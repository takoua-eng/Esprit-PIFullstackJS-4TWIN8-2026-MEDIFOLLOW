import { Controller } from '@nestjs/common';
import { Body, Get, Param, Post, Put, BadRequestException } from '@nestjs/common';
import { MessagesPatientDoctorService } from './messages-patient-doctor.service';
import { Types } from 'mongoose';

@Controller('messages-patient-doctor')
export class MessagesPatientDoctorController {

 constructor(private service: MessagesPatientDoctorService) {}


 // Endpoint to send a message
  @Post()
  send(@Body() body: any) {
    if (!body || !body.fromUserId || !body.toUserId) {
      throw new BadRequestException('fromUserId and toUserId are required');
    }
    const data = {
      ...body,
      fromUserId: new Types.ObjectId(body.fromUserId),
      toUserId: new Types.ObjectId(body.toUserId),
    };
    return this.service.sendMessage(data);
  }

  // get conversation between two users
  @Get('conversation/:user1/:user2')
  getConversation(
    @Param('user1') u1: string,
    @Param('user2') u2: string,
  ) {
    return this.service.getConversation(u1, u2);
  }

  // seulement les messages reçus par ce user
  @Get('inbox/:userId')
  getInbox(@Param('userId') id: string) {
    return this.service.getInbox(id);
  }

  // Liste des contacts (autres utilisateurs qui ont échangé des messages)
  @Get('contacts/:userId')
  getContacts(@Param('userId') userId: string) {
    return this.service.getContacts(userId);
  }

  // Marquer les messages envoyés par senderId et reçus par receiverId comme lus
  @Put('mark-read/:senderId/:receiverId')
  markAsRead(
    @Param('senderId') senderId: string,
    @Param('receiverId') receiverId: string,
  ) {
    return this.service.markAsRead(senderId, receiverId);
  }


  
}


