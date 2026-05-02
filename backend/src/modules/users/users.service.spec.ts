import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications-super-admin/notifications.service';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService - Unit Tests', () => {
  let service: UsersService;

  const mockUserModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    find: jest.fn(),
    updateOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  const mockRoleModel = {
    findOne: jest.fn(),
  };

  const mockPatientDiagnosisModel = {
    find: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  const mockServiceModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,

        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },

        {
          provide: getModelToken('Role'),
          useValue: mockRoleModel,
        },

        {
          provide: getModelToken('PatientDiagnosis'),
          useValue: mockPatientDiagnosisModel,
        },

        {
          provide: getModelToken('Service'),
          useValue: mockServiceModel,
        },

        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },

        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  // ==================================================
  // CREATE PATIENT
  // ==================================================
  it('should create patient and send notification', async () => {
    mockRoleModel.findOne.mockResolvedValue({
      _id: 'roleId',
    });

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

    mockUserModel.findByIdAndUpdate.mockResolvedValue(true);

    const savedPatient = {
      _id: 'patient1',
      firstName: 'test',
      lastName: 'user',
    };

    const saveMock = jest.fn().mockResolvedValue(savedPatient);

    // IMPORTANT :
    // mock constructor new this.userModel(dto)
    const MockUserConstructor = function (this: any, dto: any) {
      Object.assign(this, dto);
      this.save = saveMock;
    } as any;

    Object.assign(MockUserConstructor, mockUserModel);

    // remplacer userModel dans le service
    (service as any).userModel = MockUserConstructor;

    mockNotificationsService.create.mockResolvedValue(true);

    const dto = {
      email: 'test@test.com',
      password: '1234',
      firstName: 'test',
      lastName: 'user',
      assignedDoctor: 'doc1',
      assignedCoordinator: 'coord1',
    };

    const result = await service.createPatient(dto as any);

    expect(result._id).toBe('patient1');

    expect(mockNotificationsService.create).toHaveBeenCalled();

    expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
  });

  // ==================================================
  // EMAIL EXISTS TRUE
  // ==================================================
  it('should return email exists true', async () => {
    mockUserModel.findOne.mockResolvedValue({
      _id: '1',
    });

    const res = await service.emailExists('test@test.com');

    expect(res.exists).toBe(true);
  });

  // ==================================================
  // EMAIL EXISTS FALSE
  // ==================================================
  it('should return email exists false', async () => {
    mockUserModel.findOne.mockResolvedValue(null);

    const res = await service.emailExists('test@test.com');

    expect(res.exists).toBe(false);
  });

  // ==================================================
  // GET USER SUCCESS
  // ==================================================
  it('should return user by id', async () => {
    mockUserModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: '1',
          name: 'user',
        }),
      }),
    });

    const res = await service.getUser('1');

    expect(res).toBeDefined();
  });

  // ==================================================
  // GET USER NOT FOUND
  // ==================================================
  it('should throw NotFoundException if user not found', async () => {
    mockUserModel.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(service.getUser('1')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ==================================================
  // DELETE USER
  // ==================================================
  it('should archive user', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);

    mockUserModel.findById.mockResolvedValue({
      isArchived: false,
      save: saveMock,
    });

    const res = await service.deleteUser('1');

    expect(res).toBeTruthy();

    expect(saveMock).toHaveBeenCalled();
  });

  // ==================================================
  // ACTIVATE USER
  // ==================================================
  it('should activate user', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);

    mockUserModel.findById.mockResolvedValue({
      isActive: false,
      save: saveMock,
    });

    const res = await service.activateUser('1');

    expect(res).toBeTruthy();

    expect(saveMock).toHaveBeenCalled();
  });

  // ==================================================
  // DEACTIVATE USER
  // ==================================================
  it('should deactivate user', async () => {
    const saveMock = jest.fn().mockResolvedValue(true);

    mockUserModel.findById.mockResolvedValue({
      isActive: true,
      save: saveMock,
    });

    const res = await service.deactivateUser('1');

    expect(res).toBeTruthy();

    expect(saveMock).toHaveBeenCalled();
  });

  // ==================================================
  // FIND BY EMAIL
  // ==================================================
  it('should find user by email', async () => {
    mockUserModel.findOne.mockResolvedValue({
      email: 'test@test.com',
    });

    const res = await service.findByEmail('test@test.com');

    expect(res).toBeDefined();
  });
});