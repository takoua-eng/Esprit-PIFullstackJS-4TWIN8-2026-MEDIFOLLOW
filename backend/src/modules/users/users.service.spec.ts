import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { UsersService } from './users.service';
import { User } from './users.schema';
import { Role } from '../roles/role.schema';
import { Service } from '../service/services/service.schema';
import { PatientDiagnosis } from './patient-diagnosis.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import { afterEach, beforeEach, describe } from 'node:test';
import { NotificationsService } from '../notifications-super-admin/notifications.service';

jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let roleModel: any;
  let patientDiagnosisModel: any;
  let notificationsService: any;

  const mockRole        = { _id: new Types.ObjectId(), name: 'patient' };
  const mockDoctorRole  = { _id: new Types.ObjectId(), name: 'doctor' };
  const mockNurseRole   = { _id: new Types.ObjectId(), name: 'nurse' };

  // Reusable mock user returned by findById / findOne
  const mockUser: Record<string, any> = {
    _id: new Types.ObjectId(),
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: mockRole._id,
    isActive: true,
    isArchived: false,
    nurseDossier: null,
    save: jest.fn().mockResolvedValue(true),
  };

  /** Chainable query mock that resolves to `result` (thenable so direct awaiting works too). */
  const buildChain = (result: any) => {
    const resolved = Promise.resolve(result);
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(result),
      then: (onFulfilled: any, onRejected?: any) => resolved.then(onFulfilled, onRejected),
      catch: (onRejected: any) => resolved.catch(onRejected),
    };
    return chain;
  };

  /** findOneAndUpdate chain mock. */
  const buildFoaChain = (result: any) => ({ exec: jest.fn().mockResolvedValue(result) });

  beforeEach(async () => {
    userModel = {
      findOne: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(mockUser),
      find: jest.fn().mockReturnValue(buildChain([mockUser])),
      findByIdAndUpdate: jest.fn().mockReturnValue(buildChain(mockUser)),
      findOneAndUpdate: jest.fn().mockReturnValue(buildFoaChain(mockUser)),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      create: jest.fn().mockImplementation((dto: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...dto }),
      ),
    };

    // Constructor-based user model (used by createPatient with `new this.userModel(dto)`)
    const mockUserModelConstructor = jest.fn().mockImplementation((dto: any) => ({
      ...dto,
      save: jest.fn().mockResolvedValue({ _id: new Types.ObjectId(), ...dto }),
    })) as any;
    Object.assign(mockUserModelConstructor, userModel);

    roleModel = {
      findOne: jest.fn().mockResolvedValue(mockRole),
      findById: jest.fn().mockResolvedValue(mockRole),
      find: jest.fn().mockReturnValue(buildChain([mockRole])),
    };

    const serviceModel = { findById: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }) };

    patientDiagnosisModel = {
      find: jest.fn().mockReturnValue(buildChain([])),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
      insertMany: jest.fn().mockResolvedValue(true),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'PATIENT_ROLE_ID') return new Types.ObjectId().toString();
        return 'test_value';
      }),
    };

    notificationsService = { create: jest.fn().mockResolvedValue(true) };

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

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── createPatient() ────────────────────────────────────────────────────────

  describe('createPatient()', () => {
    it('should hash the password and save the patient', async () => {
      const dto = {
        email: 'new@patient.com',
        password: 'pass',
        firstName: 'John',
        doctorId: new Types.ObjectId().toString(),
      };
      await service.createPatient(dto);
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
    });

    it('should throw BadRequestException when email already exists', async () => {
      userModel.findOne.mockResolvedValueOnce({ _id: '1' });
      await expect(service.createPatient({ email: 'exists@test.com' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when password is missing', async () => {
      await expect(service.createPatient({ email: 'new@test.com' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── createDoctor() ─────────────────────────────────────────────────────────

  describe('createDoctor()', () => {
    it('should hash password, look up doctor role and call userModel.create', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockDoctorRole);
      const dto = { email: 'doctor@test.com', password: 'pass', firstName: 'Doc' };
      await service.createDoctor(dto as any);
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(roleModel.findOne).toHaveBeenCalledWith({ name: 'doctor' });
      expect(userModel.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      userModel.findOne.mockResolvedValueOnce({ _id: '1' });
      await expect(service.createDoctor({ email: 'doc@doc.com' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── createNurse() ──────────────────────────────────────────────────────────

  describe('createNurse()', () => {
    it('should hash password, look up nurse role and call userModel.create', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockNurseRole);
      const dto = { email: 'nurse@test.com', password: 'pass', firstName: 'Nurse' };
      await service.createNurse(dto as any);
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(roleModel.findOne).toHaveBeenCalledWith({ name: 'nurse' });
      expect(userModel.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email already exists', async () => {
      userModel.findOne.mockResolvedValueOnce({ _id: '1' });
      await expect(service.createNurse({ email: 'nurse@test.com' } as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── getDoctors() / getNurses() ─────────────────────────────────────────────

  describe('getDoctors()', () => {
    it('should return an array of users', async () => {
      const result = await service.getDoctors();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getNurses()', () => {
    it('should return an array of users', async () => {
      const result = await service.getNurses();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── getAllUsers() ──────────────────────────────────────────────────────────

  describe('getAllUsers()', () => {
    it('should return all users', async () => {
      const result = await service.getAllUsers();
      expect(result).toEqual([mockUser]);
    });
  });

  // ─── getUser() ──────────────────────────────────────────────────────────────

  describe('getUser()', () => {
    it('should return user by valid ObjectId', async () => {
      const id = new Types.ObjectId().toString();
      userModel.findOne.mockReturnValueOnce(buildChain(mockUser));
      const result = await service.getUser(id);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userModel.findOne.mockReturnValue(buildChain(null));
      await expect(service.getUser('invalid')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── activateUser() / deactivateUser() ──────────────────────────────────────
  // These methods use findById + save on the user document.

  describe('activateUser()', () => {
    it('should set isActive = true and save', async () => {
      const result = await service.activateUser('123');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: { isActive: true } },
        { new: true, strict: false },
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not found', async () => {
      userModel.findByIdAndUpdate.mockReturnValueOnce(buildChain(null));
      await expect(service.activateUser('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivateUser()', () => {
    it('should set isActive = false and save', async () => {
      const result = await service.deactivateUser('123');
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        '123',
        { $set: { isActive: false } },
        { new: true, strict: false },
      );
      expect(result).toEqual(mockUser);
    });
  });

  // ─── activateNurse() / deactivateNurse() / archiveNurse() ───────────────────
  // These methods use roleModel.findOne + userModel.findOneAndUpdate.

  describe('activateNurse()', () => {
    it('should call findOneAndUpdate with isActive: true', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockNurseRole);
      await service.activateNurse('3');
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '3', role: mockNurseRole._id },
        { $set: { isActive: true } },
        { new: true },
      );
    });

    it('should throw an error when nurse role not found', async () => {
      roleModel.findOne.mockResolvedValueOnce(null);
      await expect(service.activateNurse('3')).rejects.toThrow();
    });
  });

  describe('deactivateNurse()', () => {
    it('should call findOneAndUpdate with isActive: false', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockNurseRole);
      await service.deactivateNurse('3');
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '3', role: mockNurseRole._id },
        { $set: { isActive: false } },
        { new: true },
      );
    });
  });

  describe('archiveNurse()', () => {
    it('should call findOneAndUpdate with isArchived: true', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockNurseRole);
      await service.archiveNurse('3');
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '3', role: mockNurseRole._id },
        { $set: { isArchived: true } },
        { new: true },
      );
    });

    it('should throw an error when nurse role not found', async () => {
      roleModel.findOne.mockResolvedValueOnce(null);
      await expect(service.archiveNurse('3')).rejects.toThrow();
    });
  });

  // ─── archiveDoctor() ────────────────────────────────────────────────────────

  describe('archiveDoctor()', () => {
    it('should call findOneAndUpdate with isArchived: true for doctor', async () => {
      roleModel.findOne.mockResolvedValueOnce(mockDoctorRole);
      await service.archiveDoctor('2');
      expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: '2', role: mockDoctorRole._id },
        { $set: { isArchived: true } },
        { new: true },
      );
    });

    it('should throw an error when doctor role not found', async () => {
      roleModel.findOne.mockResolvedValueOnce(null);
      await expect(service.archiveDoctor('2')).rejects.toThrow();
    });
  });

  // ─── deleteUser() / restoreUser() ───────────────────────────────────────────

  describe('deleteUser()', () => {
    it('should set isArchived = true on the user and save', async () => {
      await service.deleteUser('123');
      expect(mockUser.isArchived).toBe(true);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('restoreUser()', () => {
    it('should set isArchived = false on the user and save', async () => {
      await service.restoreUser('123');
      expect(mockUser.isArchived).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  // ─── getNurseDossier() ──────────────────────────────────────────────────────

  describe('getNurseDossier()', () => {
    it('should throw NotFoundException when patient not found', async () => {
      userModel.findOne.mockReturnValueOnce(buildChain(null));
      await expect(service.getNurseDossier('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should return an object containing diagnosisEntries from the collection', async () => {
      const dossier = { bloodType: 'O+', allergies: 'None' };
      userModel.findOne.mockReturnValueOnce(
        buildChain({ _id: new Types.ObjectId(), nurseDossier: dossier }),
      );
      patientDiagnosisModel.find.mockReturnValueOnce(buildChain([]));

      const result = await service.getNurseDossier('patient1');
      expect(result).toMatchObject({ bloodType: 'O+', allergies: 'None' });
      expect((result as any).diagnosisEntries).toBeDefined();
    });
  });

  // ─── findPatientsByDoctor() ─────────────────────────────────────────────────

  describe('findPatientsByDoctor()', () => {
    it('should return an array when no doctorId is provided', async () => {
      const result = await service.findPatientsByDoctor(undefined);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
