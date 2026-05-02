import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ForbiddenException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  beforeEach(async () => {
    service = {
      createPatient: jest.fn().mockResolvedValue({ _id: '1', role: 'patient' }),
      createDoctor: jest.fn().mockResolvedValue({ _id: '2', role: 'doctor' }),
      createAdmin: jest.fn().mockResolvedValue({ _id: '3', role: 'admin' }),
      getPatients: jest.fn().mockResolvedValue([{ _id: '1' }]),
      getAllUsers: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }]),
      getUser: jest.fn().mockResolvedValue({ _id: '1', email: 'test@test.com' }),
      getNurseDossier: jest.fn().mockResolvedValue({ id: 'dossier1' }),
      updateUsers: jest.fn().mockResolvedValue({ _id: '1', updated: true }),
      deleteUser: jest.fn().mockResolvedValue({ _id: '1', isArchived: true }),
      activateUser: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create endpoints', () => {
    it('should call createPatient', async () => {
      const dto = { email: 'p@p.com' } as any;
      const file = {} as any;
      const result = await controller.createPatient(dto, file);
      expect(service.createPatient).toHaveBeenCalledWith(dto, file);
      expect(result).toEqual({ _id: '1', role: 'patient' });
    });

    it('should call createDoctor', async () => {
      const dto = { email: 'd@d.com' } as any;
      const result = await controller.createDoctor(dto, null);
      expect(service.createDoctor).toHaveBeenCalledWith(dto, null);
      expect(result).toEqual({ _id: '2', role: 'doctor' });
    });

    it('should call createAdmin', async () => {
      const dto = { email: 'a@a.com' } as any;
      const result = await controller.createAdmin(dto, null);
      expect(service.createAdmin).toHaveBeenCalledWith(dto, null);
      expect(result).toEqual({ _id: '3', role: 'admin' });
    });
  });

  describe('get endpoints', () => {
    it('should get patients', async () => {
      const result = await controller.getPatients();
      expect(service.getPatients).toHaveBeenCalled();
      expect(result).toEqual([{ _id: '1' }]);
    });

    it('should find all users', async () => {
      const result = await controller.findAll();
      expect(service.getAllUsers).toHaveBeenCalled();
      expect(result).toEqual([{ _id: '1' }, { _id: '2' }]);
    });

    it('should find one user by id when allowed (admin)', async () => {
      const req = { user: { _id: 'adminId', role: 'admin', permissions: ['users:read'] } };
      const result = await controller.findOne('1', req);
      expect(service.getUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', email: 'test@test.com' });
    });

    it('should find one user by id when allowed (patient viewing self)', async () => {
      const req = { user: { _id: '1', role: 'patient', permissions: ['profile:read'] } };
      const result = await controller.findOne('1', req);
      expect(service.getUser).toHaveBeenCalledWith('1');
    });

    it('should throw ForbiddenException if patient tries to view another profile', () => {
      const req = { user: { _id: '2', role: 'patient', permissions: ['profile:read'] } };
      expect(() => controller.findOne('1', req)).toThrow(ForbiddenException);
    });
  });

  describe('updateUsers', () => {
    it('should update user if admin', async () => {
      const req = { user: { role: 'admin', permissions: ['users:update'] } };
      const dto = { firstName: 'updated' };
      const result = await controller.updateUsers('1', dto, null, req);
      expect(service.updateUsers).toHaveBeenCalledWith('1', dto, null);
      expect(result).toEqual({ _id: '1', updated: true });
    });

    it('should update user if patient updating self', async () => {
      const req = { user: { _id: '1', role: 'patient', permissions: ['profile:update'] } };
      const dto = { firstName: 'updated', unknownField: 'hacked' };
      const result = await controller.updateUsers('1', dto, null, req);
      
      // Should filter out unknown fields for patients
      expect(service.updateUsers).toHaveBeenCalledWith('1', { firstName: 'updated' }, null);
      expect(result).toEqual({ _id: '1', updated: true });
    });

    it('should throw ForbiddenException if patient tries to update another', () => {
      const req = { user: { _id: '2', role: 'patient', permissions: ['profile:update'] } };
      expect(() => controller.updateUsers('1', {}, null, req)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if insufficient permissions', () => {
      const req = { user: { role: 'nurse', permissions: [] } };
      expect(() => controller.updateUsers('1', {}, null, req)).toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete user', async () => {
      const result = await controller.remove('1');
      expect(service.deleteUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', isArchived: true });
    });
  });

  describe('activate', () => {
    it('should activate user', async () => {
      const result = await controller.activate('1');
      expect(service.activateUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', isActive: true });
    });
  });
});
