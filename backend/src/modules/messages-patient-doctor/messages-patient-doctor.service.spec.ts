import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { MessagesPatientDoctorService } from './messages-patient-doctor.service';
import { MessagesPatientDoctor } from './messagesPatientDoctor.schema';

describe('MessagesPatientDoctorService', () => {
  let service: MessagesPatientDoctorService;
  let messageModel: any;

  const id1 = new Types.ObjectId();
  const id2 = new Types.ObjectId();
  const id3 = new Types.ObjectId();

  const buildFindChain = (messages: any[]) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(messages),
  });

  beforeEach(async () => {
    messageModel = {
      create: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesPatientDoctorService,
        {
          provide: getModelToken(MessagesPatientDoctor.name),
          useValue: messageModel,
        },
      ],
    }).compile();

    service = module.get<MessagesPatientDoctorService>(MessagesPatientDoctorService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── sendMessage() ──────────────────────────────────────────────────────────

  describe('sendMessage()', () => {
    it('should call model.create with the provided data', async () => {
      const data = { fromUserId: id1, toUserId: id2, content: 'Hello' };
      messageModel.create.mockResolvedValue({ _id: new Types.ObjectId(), ...data });
      await service.sendMessage(data);
      expect(messageModel.create).toHaveBeenCalledWith(data);
    });

    it('should return the created message', async () => {
      const data = { fromUserId: id1, toUserId: id2, content: 'Test' };
      const created = { _id: new Types.ObjectId(), ...data };
      messageModel.create.mockResolvedValue(created);
      const result = await service.sendMessage(data);
      expect(result._id).toBeDefined();
      expect(result.content).toBe('Test');
    });
  });

  // ─── getConversation() ─────────────────────────────────────────────────────

  describe('getConversation()', () => {
    it('should query with $or covering both message directions', () => {
      const sortSpy = jest.fn().mockReturnValue([]);
      messageModel.find.mockReturnValue({ sort: sortSpy });

      service.getConversation(id1.toString(), id2.toString());

      const [query] = messageModel.find.mock.calls[0];
      expect(query.$or).toHaveLength(2);
    });

    it('should use ObjectId instances in the query', () => {
      const sortSpy = jest.fn().mockReturnValue([]);
      messageModel.find.mockReturnValue({ sort: sortSpy });

      service.getConversation(id1.toString(), id2.toString());

      const [query] = messageModel.find.mock.calls[0];
      expect(query.$or[0].fromUserId).toBeInstanceOf(Types.ObjectId);
      expect(query.$or[0].toUserId).toBeInstanceOf(Types.ObjectId);
    });

    it('should sort by createdAt ascending', () => {
      const sortSpy = jest.fn().mockReturnValue([]);
      messageModel.find.mockReturnValue({ sort: sortSpy });
      service.getConversation(id1.toString(), id2.toString());
      expect(sortSpy).toHaveBeenCalledWith({ createdAt: 1 });
    });
  });

  // ─── getInbox() ────────────────────────────────────────────────────────────

  describe('getInbox()', () => {
    it('should query messages where toUserId matches the given user', () => {
      const sortSpy = jest.fn().mockReturnValue([]);
      messageModel.find.mockReturnValue({ sort: sortSpy });

      service.getInbox(id1.toString());

      const [query] = messageModel.find.mock.calls[0];
      expect(query).toMatchObject({ toUserId: expect.any(Types.ObjectId) });
    });

    it('should sort by createdAt descending', () => {
      const sortSpy = jest.fn().mockReturnValue([]);
      messageModel.find.mockReturnValue({ sort: sortSpy });
      service.getInbox(id1.toString());
      expect(sortSpy).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  // ─── getContacts() ─────────────────────────────────────────────────────────

  describe('getContacts()', () => {
    it('should return unique contacts excluding self', async () => {
      const userId = id1.toString();
      const messages = [
        // user → id2
        { fromUserId: { _id: id1, firstName: 'Alice', lastName: 'A' }, toUserId: { _id: id2, firstName: 'Bob', lastName: 'B' } },
        // id2 → user (same contact, should be deduplicated)
        { fromUserId: { _id: id2, firstName: 'Bob', lastName: 'B' }, toUserId: { _id: id1, firstName: 'Alice', lastName: 'A' } },
        // user → id3 (second unique contact)
        { fromUserId: { _id: id1, firstName: 'Alice', lastName: 'A' }, toUserId: { _id: id3, firstName: 'Carol', lastName: 'C' } },
      ];
      messageModel.find.mockReturnValue(buildFindChain(messages));

      const contacts = await service.getContacts(userId);
      expect(contacts).toHaveLength(2);
    });

    it('should include firstName, lastName and _id in each contact', async () => {
      const userId = id1.toString();
      const messages = [
        { fromUserId: { _id: id1, firstName: 'Alice', lastName: 'A' }, toUserId: { _id: id2, firstName: 'Bob', lastName: 'B' } },
      ];
      messageModel.find.mockReturnValue(buildFindChain(messages));

      const contacts = await service.getContacts(userId);
      expect(contacts[0]).toHaveProperty('firstName', 'Bob');
      expect(contacts[0]).toHaveProperty('lastName', 'B');
      expect(contacts[0]).toHaveProperty('_id');
    });

    it('should return empty array when no messages exist', async () => {
      messageModel.find.mockReturnValue(buildFindChain([]));
      const contacts = await service.getContacts(id1.toString());
      expect(contacts).toEqual([]);
    });

    it('should not include self in contacts', async () => {
      const userId = id1.toString();
      const messages = [
        { fromUserId: { _id: id1, firstName: 'Alice', lastName: 'A' }, toUserId: { _id: id2, firstName: 'Bob', lastName: 'B' } },
      ];
      messageModel.find.mockReturnValue(buildFindChain(messages));

      const contacts = await service.getContacts(userId);
      const selfInContacts = contacts.some((c: any) => c._id?.toString() === userId);
      expect(selfInContacts).toBe(false);
    });
  });

  // ─── markAsRead() ──────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should call updateMany targeting unread messages from sender to receiver', async () => {
      messageModel.updateMany.mockResolvedValue({ modifiedCount: 2 });
      await service.markAsRead(id1.toString(), id2.toString());
      expect(messageModel.updateMany).toHaveBeenCalledWith(
        {
          fromUserId: expect.any(Types.ObjectId),
          toUserId: expect.any(Types.ObjectId),
          isRead: false,
        },
        { $set: { isRead: true } },
      );
    });

    it('should resolve without throwing', async () => {
      messageModel.updateMany.mockResolvedValue({ modifiedCount: 0 });
      await expect(service.markAsRead(id1.toString(), id2.toString())).resolves.toBeUndefined();
    });
  });
});
