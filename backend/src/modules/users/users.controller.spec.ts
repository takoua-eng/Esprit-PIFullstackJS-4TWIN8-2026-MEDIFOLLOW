import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let service: any;

  beforeEach(async () => {
    service = {
      createPatient: jest.fn().mockResolvedValue({ _id: '1', role: 'patient' }),
      createDoctor: jest.fn().mockResolvedValue({ _id: '2', role: 'doctor' }),
      createNurse: jest.fn().mockResolvedValue({ _id: '3', role: 'nurse' }),
      createAdmin: jest.fn().mockResolvedValue({ _id: '4', role: 'admin' }),
      createAuditor: jest.fn().mockResolvedValue({ _id: '5', role: 'auditor' }),
      getPatients: jest.fn().mockResolvedValue([{ _id: '1' }]),
      getDoctors: jest.fn().mockResolvedValue([{ _id: '2' }]),
      getNurses: jest.fn().mockResolvedValue([{ _id: '3' }]),
      findPatientsByDoctor: jest.fn().mockResolvedValue([{ _id: '1' }]),
      getAllUsers: jest.fn().mockResolvedValue([{ _id: '1' }, { _id: '2' }]),
      getUser: jest.fn().mockResolvedValue({ _id: '1', email: 'test@test.com' }),
      getDoctor: jest.fn().mockResolvedValue({ _id: '2', role: 'doctor' }),
      getNurse: jest.fn().mockResolvedValue({ _id: '3', role: 'nurse' }),
      getNurseDossier: jest.fn().mockResolvedValue({ bloodType: 'A+' }),
      updateNurseDossier: jest.fn().mockResolvedValue({ updatedAt: new Date().toISOString() }),
      updateUsers: jest.fn().mockResolvedValue({ _id: '1', updated: true }),
      updateDoctor: jest.fn().mockResolvedValue({ _id: '2', updated: true }),
      updateNurse: jest.fn().mockResolvedValue({ _id: '3', updated: true }),
      deleteUser: jest.fn().mockResolvedValue({ _id: '1', isArchived: true }),
      activateUser: jest.fn().mockResolvedValue({ _id: '1', isActive: true }),
      archiveDoctor: jest.fn().mockResolvedValue({ _id: '2', isArchived: true }),
      archiveNurse: jest.fn().mockResolvedValue({ _id: '3', isArchived: true }),
      activateNurse: jest.fn().mockResolvedValue({ _id: '3', isActive: true }),
      deactivateNurse: jest.fn().mockResolvedValue({ _id: '3', isActive: false }),
      restoreUser: jest.fn().mockResolvedValue({ _id: '1', isArchived: false }),
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

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── Create endpoints ───────────────────────────────────────────────────────

  describe('create endpoints', () => {
    it('should call createPatient', async () => {
      const dto = { email: 'p@p.com' } as any;
      const result = await controller.createPatient(dto, undefined as any);
      expect(service.createPatient).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({ _id: '1', role: 'patient' });
    });

    it('should call createDoctor', async () => {
      const dto = { email: 'd@d.com' } as any;
      const result = await controller.createDoctor(dto, undefined as any);
      expect(service.createDoctor).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({ _id: '2', role: 'doctor' });
    });

    it('should call createNurse', async () => {
      const dto = { email: 'n@n.com', password: 'pass' } as any;
      const result = await controller.createNurse(dto, undefined as any);
      expect(service.createNurse).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({ _id: '3', role: 'nurse' });
    });

    it('should call createAdmin', async () => {
      const dto = { email: 'a@a.com' } as any;
      const result = await controller.createAdmin(dto, undefined as any);
      expect(service.createAdmin).toHaveBeenCalledWith(dto, undefined);
      expect(result).toEqual({ _id: '4', role: 'admin' });
    });
  });

  // ─── Doctor endpoints ───────────────────────────────────────────────────────

  describe('doctor endpoints', () => {
    it('getDoctors() should call service.getDoctors', async () => {
      const result = await controller.getDoctors();
      expect(service.getDoctors).toHaveBeenCalled();
      expect(result).toEqual([{ _id: '2' }]);
    });

    it('getDoctorById() should call service.getDoctor with id', async () => {
      const result = await controller.getDoctorById('2');
      expect(service.getDoctor).toHaveBeenCalledWith('2');
      expect(result).toEqual({ _id: '2', role: 'doctor' });
    });

    it('updateDoctor() should call service.updateDoctor', async () => {
      const dto = { firstName: 'Updated' };
      const result = await controller.updateDoctor('2', dto, undefined as any);
      expect(service.updateDoctor).toHaveBeenCalledWith('2', dto, undefined);
      expect(result).toEqual({ _id: '2', updated: true });
    });

    it('archiveDoctor() should call service.archiveDoctor', async () => {
      const result = await controller.archiveDoctor('2');
      expect(service.archiveDoctor).toHaveBeenCalledWith('2');
      expect(result).toEqual({ _id: '2', isArchived: true });
    });

    it('getPatients() for a doctor should scope by doctorId', async () => {
      const req = { user: { _id: 'doc1', role: 'doctor', permissions: ['patients:read'] } };
      await controller.getPatients(req as any);
      expect(service.findPatientsByDoctor).toHaveBeenCalledWith('doc1');
    });

    it('getPatients() for admin should return all (no doctorId scope)', async () => {
      const req = { user: { _id: 'admin1', role: 'admin', permissions: ['*'] } };
      await controller.getPatients(req as any);
      expect(service.findPatientsByDoctor).toHaveBeenCalledWith(undefined);
    });
  });

  // ─── Nurse endpoints ────────────────────────────────────────────────────────

  describe('nurse endpoints', () => {
    it('getNurses() should call service.getNurses', async () => {
      const result = await controller.getNurses();
      expect(service.getNurses).toHaveBeenCalled();
      expect(result).toEqual([{ _id: '3' }]);
    });

    it('getNurseById() should call service.getNurse with id', async () => {
      const result = await controller.getNurseById('3');
      expect(service.getNurse).toHaveBeenCalledWith('3');
      expect(result).toEqual({ _id: '3', role: 'nurse' });
    });

    it('updateNurse() should call service.updateNurse', async () => {
      const dto = { firstName: 'Updated' };
      const result = await controller.updateNurse('3', dto, undefined as any);
      expect(service.updateNurse).toHaveBeenCalledWith('3', dto, undefined);
      expect(result).toEqual({ _id: '3', updated: true });
    });

    it('archiveNurse() should call service.archiveNurse', async () => {
      const result = await controller.archiveNurse('3');
      expect(service.archiveNurse).toHaveBeenCalledWith('3');
      expect(result).toEqual({ _id: '3', isArchived: true });
    });

    it('activateNurse() should call service.activateNurse', async () => {
      const result = await controller.activateNurse('3');
      expect(service.activateNurse).toHaveBeenCalledWith('3');
      expect(result).toEqual({ _id: '3', isActive: true });
    });

    it('deactivateNurse() should call service.deactivateNurse', async () => {
      const result = await controller.deactivateNurse('3');
      expect(service.deactivateNurse).toHaveBeenCalledWith('3');
      expect(result).toEqual({ _id: '3', isActive: false });
    });
  });

  // ─── Nurse dossier ──────────────────────────────────────────────────────────

  describe('nurse dossier endpoints', () => {
    const nurseReq = { user: { _id: 'nurse1', role: 'nurse', permissions: ['patients:read'] } };

    it('getNurseDossier() should call service for nurse user', async () => {
      const result = await controller.getNurseDossier('patient1', nurseReq as any);
      expect(service.getNurseDossier).toHaveBeenCalledWith('patient1');
      expect(result).toEqual({ bloodType: 'A+' });
    });

    it('getNurseDossier() should throw ForbiddenException when patient tries to view another dossier', () => {
      const req = { user: { _id: 'patient99', role: 'patient', permissions: ['profile:read'] } };
      expect(() => controller.getNurseDossier('patient1', req as any)).toThrow(ForbiddenException);
    });

    it('getNurseDossier() should allow patient to view own dossier', async () => {
      const req = { user: { _id: 'patient1', role: 'patient', permissions: ['profile:read'] } };
      const result = await controller.getNurseDossier('patient1', req as any);
      expect(service.getNurseDossier).toHaveBeenCalledWith('patient1');
      expect(result).toEqual({ bloodType: 'A+' });
    });

    it('updateNurseDossier() should call service.updateNurseDossier', async () => {
      const dto = { bloodType: 'B+' } as any;
      await controller.updateNurseDossier('patient1', dto);
      expect(service.updateNurseDossier).toHaveBeenCalledWith('patient1', dto);
    });
  });

  // ─── General user endpoints ─────────────────────────────────────────────────

  describe('general user endpoints', () => {
    it('findAll() should return all users', async () => {
      const result = await controller.findAll();
      expect(service.getAllUsers).toHaveBeenCalled();
      expect(result).toEqual([{ _id: '1' }, { _id: '2' }]);
    });

    it('findOne() should allow admin to view any profile', async () => {
      const req = { user: { _id: 'adminId', role: 'admin', permissions: ['users:read'] } };
      const result = await controller.findOne('1', req);
      expect(service.getUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', email: 'test@test.com' });
    });

    it('findOne() should allow patient to view own profile', async () => {
      const req = { user: { _id: '1', role: 'patient', permissions: ['profile:read'] } };
      const result = await controller.findOne('1', req);
      expect(service.getUser).toHaveBeenCalledWith('1');
    });

    it('findOne() should throw ForbiddenException when patient views another profile', () => {
      const req = { user: { _id: '2', role: 'patient', permissions: ['profile:read'] } };
      expect(() => controller.findOne('1', req)).toThrow(ForbiddenException);
    });

    it('remove() should call service.deleteUser', async () => {
      const result = await controller.remove('1');
      expect(service.deleteUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', isArchived: true });
    });

    it('activate() should call service.activateUser', async () => {
      const result = await controller.activate('1');
      expect(service.activateUser).toHaveBeenCalledWith('1');
      expect(result).toEqual({ _id: '1', isActive: true });
    });

    it('restore() should call service.restoreUser', async () => {
      const result = await controller.restore('1');
      expect(service.restoreUser).toHaveBeenCalledWith('1');
    });
  });

  // ─── updateUsers() permission checks ────────────────────────────────────────

  describe('updateUsers()', () => {
    it('should call service.updateUsers when admin updates any user', async () => {
      const req = { user: { role: 'admin', permissions: ['users:update'] } };
      const result = await controller.updateUsers('1', { firstName: 'Updated' }, undefined as any, req);
      expect(service.updateUsers).toHaveBeenCalledWith('1', { firstName: 'Updated' }, undefined);
      expect(result).toEqual({ _id: '1', updated: true });
    });

    it('should filter fields when patient updates own profile', async () => {
      const req = { user: { _id: '1', role: 'patient', permissions: ['profile:update'] } };
      const dto = { firstName: 'Updated', unknownField: 'hacked' };
      await controller.updateUsers('1', dto, undefined as any, req);
      expect(service.updateUsers).toHaveBeenCalledWith(
        '1',
        expect.not.objectContaining({ unknownField: 'hacked' }),
        undefined,
      );
    });

    it('should throw ForbiddenException when patient updates another user', () => {
      const req = { user: { _id: '2', role: 'patient', permissions: ['profile:update'] } };
      expect(() => controller.updateUsers('1', {}, undefined as any, req)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when no update permission', () => {
      const req = { user: { role: 'nurse', permissions: [] } };
      expect(() => controller.updateUsers('1', {}, undefined as any, req)).toThrow(ForbiddenException);
    });
  });
});
