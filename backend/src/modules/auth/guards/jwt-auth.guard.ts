import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private jwtService: JwtService;

  constructor(
    private configService: ConfigService,
    private reflector: Reflector, // ✅ AJOUT IMPORTANT
  ) {
    this.jwtService = new JwtService({
      secret: configService.get<string>('JWT_SECRET'),
    });
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];

    if (!token) throw new UnauthorizedException('Token manquant');

    try {
      const payload = this.jwtService.verify(token);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }
}