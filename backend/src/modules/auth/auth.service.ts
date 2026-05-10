import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/users.schema';
import { SignInDto } from '../auth/dto/SignIn.dto';
import { randomBytes } from 'crypto';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new BadRequestException('Email non trouvé');

    // Generate 6-digit code
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    (user as any).resetToken = token;
    (user as any).resetTokenExpiry = Date.now() + 3600_000;
    await user.save();

    await this.sendResetEmail(email, token);
    return { message: 'Email de réinitialisation envoyé' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({ resetToken: token }).exec();
    if (!user) throw new BadRequestException('Token invalide');

    if ((user as any).resetTokenExpiry < Date.now()) {
      throw new BadRequestException('Token expiré');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    (user as any).resetToken = null;
    (user as any).resetTokenExpiry = null;
    await user.save();

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async changePassword(email: string, currentPassword: string, newPassword: string, token: string) {
    const user = await this.userModel.findOne({ email, resetToken: token }).exec();
    if (!user) throw new BadRequestException('Code de vérification invalide ou utilisateur introuvable');

    if ((user as any).resetTokenExpiry < Date.now()) {
      throw new BadRequestException('Code de vérification expiré');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    (user as any).resetToken = null;
    (user as any).resetTokenExpiry = null;
    await user.save();

    return { message: 'Mot de passe modifié avec succès' };
  }

  async signIn(
    signInDto: SignInDto,
    req: Request,
  ): Promise<{
    accessToken: string;
    role: string;
    permissions: string[];
    user?: any;
  }> {
    const email = signInDto?.email?.trim();
    const password = signInDto?.password ?? '';

    if (!email || !password) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const user = await this.userModel
      .findOne({ email: new RegExp(`^${escaped}$`, 'i') })
      .populate<{ name: string; permissions: string[] }>(
        'role',
        'name permissions',
      )
      .exec();

    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (user.isArchived) throw new UnauthorizedException('Compte archivé');
    if (user.isActive === false) throw new UnauthorizedException('Compte désactivé');

    let isPasswordValid = false;

    // Fast check for plain text password to avoid expensive bcrypt if possible
    if (user.password === password) {
      isPasswordValid = true;
      // Migration automatique non bloquante
      bcrypt.hash(password, 8).then(hashed => {
        user.password = hashed;
        user.save().catch(e => console.error('Error migrating password:', e));
      });
    } else {
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const roleName =
      user.role && typeof user.role === 'object' && 'name' in user.role
        ? String((user.role as any).name)
        : '';

    const permissions =
      user.role && typeof user.role === 'object' && 'permissions' in user.role
        ? (user.role as any).permissions || []
        : [];

    const payload = {
      sub: user._id,
      email: user.email,
      role: roleName,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    // Fire and forget audit log to avoid blocking the response
    this.auditService.create({
      userId:    user._id.toString(),
      userEmail: user.email,
      userRole:  roleName,
      userName:  `${(user as any).firstName ?? ''} ${(user as any).lastName ?? ''}`.trim() || user.email,
      action:    'LOGIN',
      entityType: 'AUTH',
      entityId:  user._id.toString(),
      before: null,
      after:  null,
      ipAddress: req?.ip ?? 'unknown',
      userAgent: (req as any)?.headers?.['user-agent'] ?? 'unknown',
    }).catch(err => console.error('Audit Log Error:', err));

    return {
      accessToken,
      role: roleName,
      permissions,
      user,
    };
  }

  private async sendResetEmail(email: string, token: string) {
    console.log('--- DEBUG SMTP CONFIG ---');
    console.log('HOST:', this.configService.get<string>('SMTP_HOST'));
    console.log('PORT:', this.configService.get<string>('SMTP_PORT'));
    console.log('USER:', this.configService.get<string>('SMTP_USER'));
    console.log('-------------------------');

    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT')),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    // Code validation instead of Link
    // const resetLink = `${this.configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}`;

    try {
      await transporter.sendMail({
        from: `"Mediflow" <${this.configService.get<string>('SMTP_USER')}>`,
        to: email,
        subject: 'Réinitialisation du mot de passe',
        html: `
          <h3>Réinitialisation du mot de passe</h3>
          <p>Voici votre code de vérification pour réinitialiser votre mot de passe :</p>
          <h2 style="background: #f4f4f4; padding: 10px; display: inline-block; letter-spacing: 2px;">${token}</h2>
          <p>Ce code expirera dans 1 heure.</p>
        `,
      });
    } catch (error) {
      console.warn(`⚠️ ERREUR SMTP: Impossible d'envoyer l'email à ${email}.`);
      console.warn(`👉 [MODE DÉVELOPPEMENT] Voici le code OTP généré pour vos tests : ${token}`);
    }
  }
}