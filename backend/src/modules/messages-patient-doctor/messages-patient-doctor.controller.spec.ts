import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessagesPatientDoctorController } from './messages-patient-doctor.controller';
import { MessagesPatientDoctorService } from './messages-patient-doctor.service';

describe('MessagesPatientDoctorController', () => {
  let controller: MessagesPatientDoctorController;
  let service: any;

  const fromId = new Types.ObjectId().toString();
  const toId = new Types.ObjectId().toString();

  beforeEach(async () => {
    service = {
      sendMessage: jest.fn().mockResolvedValue({ _id: 'msg1', content: 'Hello' }),
      getConversation: jest.fn().mockReturnValue([]),
      getInbox: jest.fn().mockReturnValue([]),
      getContacts: jest.fn().mockResolvedValue([]),
      markAsRead: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesPatientDoctorController],
      providers: [{ provide: MessagesPatientDoctorService, useValue: service }],
    }).compile();

    controller = module.get<MessagesPatientDoctorController>(MessagesPatientDoctorController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── send() ────────────────────────────────────────────────────────────────

  describe('send()', () => {
    it('should call service.sendMessage with ObjectId-converted ids', () => {
      const body = { fromUserId: fromId, toUserId: toId, content: 'Hello' };
      controller.send(body);
      expect(service.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Hello',
          fromUserId: expect.any(Types.ObjectId),
          toUserId: expect.any(Types.ObjectId),
        }),
      );
    });

    it('should return the value from service.sendMessage', () => {
      const result = controller.send({ fromUserId: fromId, toUserId: toId });
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when fromUserId is missing', () => {
      expect(() => controller.send({ toUserId: toId, content: 'Hi' })).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when toUserId is missing', () => {
      expect(() => controller.send({ fromUserId: fromId, content: 'Hi' })).toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when body is null', () => {
      expect(() => controller.send(null)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when body is empty object', () => {
      expect(() => controller.send({})).toThrow(BadRequestException);
    });

    it('should not call service when validation fails', () => {
      try { controller.send({ fromUserId: fromId }); } catch {}
      expect(service.sendMessage).not.toHaveBeenCalled();
    });
  });

  // ─── getConversation() ─────────────────────────────────────────────────────

  describe('getConversation()', () => {
    it('should call service.getConversation with the two user ids', () => {
      controller.getConversation(fromId, toId);
      expect(service.getConversation).toHaveBeenCalledWith(fromId, toId);
    });

    it('should return the conversation array from service', () => {
      service.getConversation.mockReturnValue([{ content: 'test' }]);
      const result = controller.getConversation(fromId, toId);
      expect(result).toEqual([{ content: 'test' }]);
    });
  });

  // ─── getInbox() ────────────────────────────────────────────────────────────

  describe('getInbox()', () => {
    it('should call service.getInbox with the userId', () => {
      controller.getInbox(fromId);
      expect(service.getInbox).toHaveBeenCalledWith(fromId);
    });

    it('should return inbox messages from service', () => {
      service.getInbox.mockReturnValue([{ content: 'inbox msg' }]);
      const result = controller.getInbox(fromId);
      expect(result).toEqual([{ content: 'inbox msg' }]);
    });
  });

  // ─── getContacts() ─────────────────────────────────────────────────────────

  describe('getContacts()', () => {
    it('should call service.getContacts with the userId', () => {
      controller.getContacts(fromId);
      expect(service.getContacts).toHaveBeenCalledWith(fromId);
    });

    it('should return contacts list from service', async () => {
      service.getContacts.mockResolvedValue([{ firstName: 'Bob' }]);
      const result = await controller.getContacts(fromId);
      expect(result).toEqual([{ firstName: 'Bob' }]);
    });

    it('should return empty array when no contacts', async () => {
      service.getContacts.mockResolvedValue([]);
      const result = await controller.getContacts(fromId);
      expect(result).toEqual([]);
    });
  });

  // ─── markAsRead() ──────────────────────────────────────────────────────────

  describe('markAsRead()', () => {
    it('should call service.markAsRead with senderId and receiverId', () => {
      controller.markAsRead(fromId, toId);
      expect(service.markAsRead).toHaveBeenCalledWith(fromId, toId);
    });

    it('should resolve without throwing on success', async () => {
      service.markAsRead.mockResolvedValue(undefined);
      await expect(controller.markAsRead(fromId, toId)).resolves.toBeUndefined();
    });
  });
});
