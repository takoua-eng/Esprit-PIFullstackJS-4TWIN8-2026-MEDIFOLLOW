import {
  Controller,
  Post,
  Body,
  Req,
  Get,
  UseGuards,
  Request,
  UnauthorizedException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from '../auth/dto/SignIn.dto';
import { ForgotPasswordDto } from '../auth/dto/forgot-password.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RoleDocument } from '../roles/role.schema';
import express from 'express';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';

// 👇 عدّل path حسب مشروعك
import { User, UserDocument } from '../users/users.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  // ================= CLASSIC LOGIN =================
  @Post('login')
  signIn(@Body() signInDto: SignInDto, @Req() req: express.Request) {
    return this.authService.signIn(signInDto, req);
  }

  /** Refresh permissions from DB — call on app init or after role change */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Request() req: any) {
    const user = await this.usersService.findByIdForAuth(req.user._id);
    if (!user) return req.user;
    const role = user.role as unknown as RoleDocument;
    return {
      _id: user._id.toString(),
      email: user.email,
      role: role?.name ?? '',
      permissions: role?.permissions ?? [],
    };
  }

  // ================= LOGOUT =================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    // Interceptor will auto-log this as LOGOUT action
    return { message: 'Logged out successfully' };
  }

  // ================= FORGOT PASSWORD =================
  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  // ================= RESET PASSWORD =================
  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ================= FACE LOGIN =================
  @Post('face-login')
  async faceLogin(@Body() body: any) {
    const { faceDescriptor } = body;

    if (!faceDescriptor) {
      throw new UnauthorizedException('No face data provided');
    }

    const users = await this.userModel.find({
      faceDescriptor: { $exists: true, $ne: [] },
    }).populate('role', 'name permissions');

    let bestMatch: any = null; // Use any to allow populated role access
    let minDistance = Infinity;

    for (const user of users) {
      const distance = this.euclideanDistance(
        faceDescriptor,
        user.faceDescriptor,
      );

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    if (bestMatch && minDistance < 0.6) {
      const roleName = bestMatch.role?.name || '';
      return {
        user: bestMatch,
        role: roleName,
        permissions: bestMatch.role?.permissions || [],
        token: this.generateJWT(bestMatch, roleName),
      };
    }

    throw new UnauthorizedException('Face not recognized');
  }

  // ================= REGISTER FACE =================
  @UseGuards(JwtAuthGuard)
  @Post('register-face')
  async registerFace(@Request() req: any, @Body() body: any) {
    const { faceDescriptor } = body;
    if (!faceDescriptor) {
      throw new BadRequestException('No face data provided');
    }
    const user = await this.userModel.findById(req.user._id);
    if (!user) throw new NotFoundException('User not found');
    user.faceDescriptor = faceDescriptor;
    await user.save();
    return { message: 'Face successfully registered' };
  }

  // ================= ENROLL FACE (DEMO/TESTING) =================
  @Post('enroll-face')
  async enrollFacePublic(@Body() body: any) {
    const { email, faceDescriptor } = body;
    if (!email || !faceDescriptor) {
      throw new BadRequestException('Email and face data required');
    }
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('User not found');
    
    user.faceDescriptor = faceDescriptor;
    await user.save();
    return { message: 'Face successfully enrolled' };
  }

  // ================= DISTANCE =================
  euclideanDistance(desc1: number[], desc2: number[]) {
    return Math.sqrt(
      desc1.reduce((sum, val, i) => sum + Math.pow(val - desc2[i], 2), 0),
    );
  }

  // ================= JWT =================
  generateJWT(user: any, roleName: string) {
    return this.jwtService.sign({
      sub: user._id,
      email: user.email,
      role: roleName,
      permissions: user.role?.permissions || [],
    });
  }
}
