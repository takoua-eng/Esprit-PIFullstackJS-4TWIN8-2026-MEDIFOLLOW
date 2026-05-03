import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { User } from '../users/users.schema';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userModel: any;
  let jwtService: any;
  let configService: any;
  let auditService: any;

  let mockUser: any;

  beforeEach(async () => {
    mockUser = {
      _id: '123',
      email: 'test@example.com',
      password: 'hashed_password',
      role: { name: 'ADMIN', permissions: ['read'] },
      isArchived: false,
      isActive: true,
      save: jest.fn().mockResolvedValue(true),
    };

    userModel = {
      findOne: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUser),
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('jwt_token'),
    };

    configService = {
      get: jest.fn().mockReturnValue('config_value'),
    };

    auditService = {
      create: jest.fn().mockResolvedValue(true),
    };

    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: jest.fn().mockResolvedValue(true),
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should generate a token and send an email', async () => {
      const result = await service.forgotPassword('test@example.com');
      
      expect(userModel.findOne).toHaveBeenCalled();
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.resetToken).toBeDefined();
      expect(mockUser.resetTokenExpiry).toBeDefined();
      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Email de réinitialisation envoyé' });
    });

    it('should throw BadRequestException if user is not found', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.forgotPassword('unknown@example.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockUser.resetTokenExpiry = Date.now() + 10000; // future
      
      const result = await service.resetPassword('token123', 'newPass');
      
      expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 10);
      expect(mockUser.password).toBe('new_hashed_password');
      expect(mockUser.resetToken).toBeNull();
      expect(mockUser.resetTokenExpiry).toBeNull();
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Mot de passe réinitialisé avec succès' });
    });

    it('should throw BadRequestException if token is invalid', async () => {
      userModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      await expect(service.resetPassword('invalid', 'newPass')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if token is expired', async () => {
      mockUser.resetTokenExpiry = Date.now() - 10000; // past
      await expect(service.resetPassword('token123', 'newPass')).rejects.toThrow(BadRequestException);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUser.resetTokenExpiry = Date.now() + 10000;
      
      const result = await service.changePassword('test@example.com', 'oldPass', 'newPass', 'token123');
      
      expect(bcrypt.compare).toHaveBeenCalledWith('oldPass', 'hashed_password');
      expect(bcrypt.hash).toHaveBeenCalledWith('newPass', 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Mot de passe modifié avec succès' });
    });

    it('should throw BadRequestException if current password does not match', async () => {
      mockUser.resetTokenExpiry = Date.now() + 10000;
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(service.changePassword('test@example.com', 'wrong', 'newPass', 'token123'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('signIn', () => {
    const mockRequest = { ip: '127.0.0.1', headers: { 'user-agent': 'test-agent' } };

    it('should sign in user and return token and permissions', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const result = await service.signIn(dto, mockRequest as any);
      
      expect(jwtService.sign).toHaveBeenCalled();
      expect(auditService.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt_token');
      expect(result.role).toBe('ADMIN');
      expect(result.permissions).toEqual(['read']);
    });

    it('should throw UnauthorizedException for missing credentials', async () => {
      await expect(service.signIn({ email: '', password: '' }, mockRequest as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUser.password = 'hashed';
      
      await expect(service.signIn({ email: 'test@example.com', password: 'wrong' }, mockRequest as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is archived', async () => {
      mockUser.isArchived = true;
      await expect(service.signIn({ email: 'test@example.com', password: 'password' }, mockRequest as any))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should migrate password if it is stored in plain text', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockUser.password = 'plain_password'; // plain text matches input
      
      const result = await service.signIn({ email: 'test@example.com', password: 'plain_password' }, mockRequest as any);
      
      expect(bcrypt.hash).toHaveBeenCalledWith('plain_password', 10);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result.accessToken).toBe('jwt_token');
    });
  });
});
