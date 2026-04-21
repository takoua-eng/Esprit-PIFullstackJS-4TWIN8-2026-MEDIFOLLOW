import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MessagesPatientDoctor, MessagesPatientDoctorDocument } from './messagesPatientDoctor.schema';

@Injectable()
export class MessagesPatientDoctorService {



  constructor(
    @InjectModel(MessagesPatientDoctor.name)
    private messageModel: Model<MessagesPatientDoctorDocument>,
  ) { }

  sendMessage(data: any) {
    return this.messageModel.create(data);
  }

  getConversation(user1: string, user2: string) {
    // Convertir les strings en ObjectId avant la query
    const id1 = new Types.ObjectId(user1);
    const id2 = new Types.ObjectId(user2);

    return this.messageModel
      .find({
        $or: [
          { fromUserId: id1, toUserId: id2 },
          { fromUserId: id2, toUserId: id1 },
        ],
      })
      .sort({ createdAt: 1 });
  }

  getInbox(userId: string) {
    const id = new Types.ObjectId(userId);
    return this.messageModel
      .find({ toUserId: id })
      .sort({ createdAt: -1 });
  }

  /**
   * Returns the list of unique "other" users who have exchanged messages
   * with the given userId, with firstName/lastName populated.
   */
  async getContacts(userId: string): Promise<any[]> {
    const id = new Types.ObjectId(userId);

    const messages = await this.messageModel
      .find({ $or: [{ fromUserId: id }, { toUserId: id }] })
      .populate('fromUserId', 'firstName lastName _id')
      .populate('toUserId', 'firstName lastName _id')
      .sort({ createdAt: -1 })
      .exec();

    const seen = new Set<string>();
    const contacts: any[] = [];

    for (const msg of messages) {
      const from = msg.fromUserId as any;
      const to = msg.toUserId as any;
      const other = from._id?.toString() === userId ? to : from;
      const otherId = other._id?.toString();
      if (otherId && !seen.has(otherId)) {
        seen.add(otherId);
        contacts.push({ _id: other._id, firstName: other.firstName, lastName: other.lastName });
      }
    }

    return contacts;
  }

  /**
   * Mark all messages from senderId → receiverId as read.
   */
  async markAsRead(senderId: string, receiverId: string): Promise<void> {
    const sId = new Types.ObjectId(senderId);
    const rId = new Types.ObjectId(receiverId);
    await this.messageModel.updateMany(
      { fromUserId: sId, toUserId: rId, isRead: false },
      { $set: { isRead: true } },
    );
  }
}



