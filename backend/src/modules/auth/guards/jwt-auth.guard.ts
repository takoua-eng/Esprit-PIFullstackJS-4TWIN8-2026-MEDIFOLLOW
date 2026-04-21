// src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  // ✅ Optionnel: Personnaliser la logique d'activation
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Tu peux ajouter du logging ou des conditions ici
    return super.canActivate(context);
  }

  // ✅ Optionnel: Gérer les erreurs d'authentification de façon personnalisée
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    // Si erreur ou pas d'user → rejeter avec Unauthorized


    // ✅ Retourner l'utilisateur pour l'attacher à request.user
    return user;
  }
}
