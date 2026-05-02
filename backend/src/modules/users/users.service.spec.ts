import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications-super-admin/notifications.service';
import { User } from './users.schema';
import { Role } from '../roles/role.schema';
import { Service } from '../service/services/service.schema';
import { PatientDiagnosis } from './patient-diagnosis.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { Types } from 'mongoose';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let roleModel: any;
  let serviceModel: any;
  let notificationsService: any;

  const mockRole = { _id: new Types.ObjectId(), name: 'patient' };
  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: mockRole._id,
    save: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockUser),
      create: jest.fn().mockImplementation((dto) => Promise.resolve({ _id: new Types.ObjectId(), ...dto })),
      findByIdAndUpdate: jest.fn().mockResolvedValue(true),
      find: jest.fn().mockReturnValue(Object.assign(Promise.resolve([mockUser]), {
        populate: jest.fn().mockReturnValue(Object.assign(Promise.resolve([mockUser]), {
          select: jest.fn().mockReturnThis(),
          lean: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([mockUser]),
        })),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockUser]),
      })),
    };

    // User model needs to be a constructor for `new this.userModel()`
    const mockUserModelConstructor = jest.fn().mockImplementation((dto) => {
      return {
        ...dto,
        save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...dto }),
      };
    }) as any;
    
    // Copy the mocked static methods to the constructor
    Object.assign(mockUserModelConstructor, userModel);

    roleModel = {
      findOne: jest.fn().mockResolvedValue(mockRole),
      findById: jest.fn().mockResolvedValue(mockRole),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockRole]),
      }),
    };

    serviceModel = {
      findById: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    const patientDiagnosisModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
      insertMany: jest.fn().mockResolvedValue(true),
    };

    const configService = {
      get: jest.fn((key) => {
        if (key === 'PATIENT_ROLE_ID') return new Types.ObjectId().toString();
        return 'test_config';
      }),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue(true),
    };

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModelConstructor },
        { provide: getModelToken(Role.name), useValue: roleModel },
        { provide: getModelToken(Service.name), useValue: serviceModel },
        { provide: getModelToken(PatientDiagnosis.name), useValue: patientDiagnosisModel },
        { provide: ConfigService, useValue: configService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPatient', () => {
    it('should create a patient successfully', async () => {
      const dto = { email: 'new@patient.com', password: 'pass', firstName: 'John', doctorId: new Types.ObjectId().toString() };
      
      const result = await service.createPatient(dto);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(result.email).toBe('new@patient.com');
      expect(result.password).toBe('hashed_password');
      expect(notificationsService.create).toHaveBeenCalled(); // Should notify doctor
      expect(nodemailer.createTransport).toHaveBeenCalled(); // Welcome email
    });

    it('should throw BadRequestException if email exists', async () => {
      userModel.findOne.mockResolvedValueOnce({ _id: '1', email: 'existing@patient.com' });
      await expect(service.createPatient({ email: 'existing@patient.com' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if password is missing', async () => {
      await expect(service.createPatient({ email: 'new@patient.com' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDoctor / createUser', () => {
    it('should create a doctor successfully', async () => {
      const dto = { email: 'doctor@test.com', password: 'pass', firstName: 'Doc' };
      const result = await service.createDoctor(dto as any);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(roleModel.findOne).toHaveBeenCalledWith({ name: 'doctor' });
      expect(result.email).toBe('doctor@test.com');
    });

    it('should throw BadRequestException if email exists', async () => {
      userModel.findOne.mockResolvedValueOnce({ _id: '1' });
      await expect(service.createDoctor({ email: 'doc@doc.com' } as any)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllUsers', () => {
    it('should return users', async () => {
      const result = await service.getAllUsers();
      expect(result).toEqual([mockUser]);
    });
  });

  describe('getUser', () => {
    it('should return user by valid ObjectId', async () => {
      const id = new Types.ObjectId().toString();
      userModel.findOne.mockReturnValueOnce({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockUser)
      });
      const result = await service.getUser(id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if not found', async () => {
      userModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      });
      await expect(service.getUser('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activateUser / deactivateUser', () => {
    it('should activate user', async () => {
      const result = await service.activateUser('123');
      expect(mockUser.isActive).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toBe(true); // Save returns true in mock
    });

    it('should deactivate user', async () => {
      const result = await service.deactivateUser('123');
      expect(mockUser.isActive).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found for activation', async () => {
      userModel.findById.mockResolvedValueOnce(null);
      await expect(service.activateUser('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser / restoreUser', () => {
    it('should delete (archive) user', async () => {
      await service.deleteUser('123');
      expect(mockUser.isArchived).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('should restore (unarchive) user', async () => {
      await service.restoreUser('123');
      expect(mockUser.isArchived).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });
});
