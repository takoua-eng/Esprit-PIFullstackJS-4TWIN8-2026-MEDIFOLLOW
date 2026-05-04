// src/auth/strategies/jwt.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../modules/users/users.service';
import { RoleDocument } from '../../modules/roles/role.schema';

interface JwtPayload {
  sub: string;
  email: string;
}

interface JwtUser {
  _id: string;
  email: string;
  role: string;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string, // ✅ fix TypeScript
    });
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const user = await this.usersService.findByIdForAuth(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Compte désactivé');
    }

    if (user.isArchived) {
      throw new UnauthorizedException('Compte archivé');
    }

    const role = user.role as unknown as RoleDocument;

    if (!role) {
      throw new UnauthorizedException('Role introuvable');
    }

    return {
      _id: user._id.toString(),
      email: user.email,
      role: role.name,
      permissions: role.permissions || [],
    };
  }
}