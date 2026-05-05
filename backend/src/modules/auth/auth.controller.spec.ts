import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../users/users.schema';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let usersService: any;
  let userModel: any;
  let jwtService: any;

  beforeEach(async () => {
    authService = {
      signIn: jest.fn().mockResolvedValue({ accessToken: 'jwt', role: 'ADMIN', permissions: [] }),
      forgotPassword: jest.fn().mockResolvedValue({ message: 'sent' }),
      resetPassword: jest.fn().mockResolvedValue({ message: 'reset' }),
      changePassword: jest.fn().mockResolvedValue({ message: 'changed' }),
    };

    usersService = {
      findByIdForAuth: jest.fn().mockResolvedValue({
        _id: '123',
        email: 'test@test.com',
        role: { name: 'ADMIN', permissions: ['read'] }
      }),
    };

    userModel = {
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          { _id: '1', faceDescriptor: [0.1, 0.2], role: { name: 'NURSE' } },
        ]),
      }),
      findById: jest.fn().mockResolvedValue({
        _id: '1',
        faceDescriptor: [],
        save: jest.fn().mockResolvedValue(true),
      }),
      findOne: jest.fn().mockResolvedValue({
        _id: '2',
        email: 'test@test.com',
        save: jest.fn().mockResolvedValue(true),
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('jwt_face_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
    it('should call authService.signIn', async () => {
      const dto = { email: 'a@a.com', password: 'pass' };
      const req = {} as any;
      const res = await controller.signIn(dto, req);
      expect(authService.signIn).toHaveBeenCalledWith(dto, req);
      expect(res.accessToken).toBe('jwt');
    });
  });

  describe('getMe', () => {
    it('should return user info with populated role', async () => {
      const req = { user: { _id: '123' } };
      const res = await controller.getMe(req);
      expect(usersService.findByIdForAuth).toHaveBeenCalledWith('123');
      expect(res.role).toBe('ADMIN');
      expect(res.permissions).toEqual(['read']);
    });
  });

  describe('logout', () => {
    it('should return logout message', async () => {
      const res = await controller.logout({});
      expect(res.message).toBe('Logged out successfully');
    });
  });

  describe('forgotPassword / resetPassword / changePassword', () => {
    it('should call corresponding authService methods', async () => {
      await controller.forgotPassword({ email: 'a@a.com' });
      expect(authService.forgotPassword).toHaveBeenCalledWith('a@a.com');

      await controller.resetPassword({ token: '123', newPassword: 'pass' });
      expect(authService.resetPassword).toHaveBeenCalledWith('123', 'pass');

      await controller.changePassword({ email: 'a@a.com', currentPassword: 'old', newPassword: 'new', token: '123' });
      expect(authService.changePassword).toHaveBeenCalledWith('a@a.com', 'old', 'new', '123');
    });
  });

  describe('faceLogin', () => {
    it('should login user if face matches closely', async () => {
      const res = await controller.faceLogin({ faceDescriptor: [0.1, 0.2] });
      expect(res.token).toBe('jwt_face_token');
      expect(res.role).toBe('NURSE');
    });

    it('should throw UnauthorizedException if no match is close enough', async () => {
      // 0.9 is completely different, distance > 0.6
      await expect(controller.faceLogin({ faceDescriptor: [0.9, 0.9] }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if no face data provided', async () => {
      await expect(controller.faceLogin({})).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('registerFace', () => {
    it('should save face descriptor to user', async () => {
      const req = { user: { _id: '1' } };
      const res = await controller.registerFace(req, { faceDescriptor: [0.1] });
      expect(res.message).toBe('Face successfully registered');
      expect(userModel.findById).toHaveBeenCalledWith('1');
    });

    it('should throw BadRequestException if no descriptor provided', async () => {
      await expect(controller.registerFace({ user: { _id: '1' } }, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('enrollFacePublic', () => {
    it('should save face for a given email', async () => {
      const res = await controller.enrollFacePublic({ email: 'test@test.com', faceDescriptor: [0.1] });
      expect(res.message).toBe('Face successfully enrolled');
      expect(userModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
    });
  });
});
