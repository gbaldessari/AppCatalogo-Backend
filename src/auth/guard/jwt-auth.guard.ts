import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación para proteger rutas usando JWT.
 *
 * @remarks
 * Utiliza la estrategia 'jwt' de Passport para validar el token de acceso del usuario.
 * Si el token es válido, permite el acceso a la ruta protegida.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}