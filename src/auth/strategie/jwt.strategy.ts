import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Estrategia de autenticación JWT para usuarios.
 *
 * @remarks
 * Utiliza Passport y la estrategia JWT para validar tokens de acceso en las solicitudes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Configura la estrategia JWT.
   *
   * @remarks
   * Extrae el token JWT del encabezado de autorización tipo Bearer y valida su firma.
   */
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'defaultSecretKey',
    });
  }

  /**
   * Valida el payload del token JWT y retorna los datos relevantes del usuario.
   *
   * @param payload - El contenido decodificado del token JWT.
   * @returns Un objeto con el ID y correo electrónico del usuario autenticado.
   */
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}