import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Esquema que representa un usuario en la base de datos.
 *
 * @remarks
 * Utilizado para la autenticación y gestión de usuarios.
 *
 * @extends Document
 */
@Schema()
export class User extends Document {
  /**
   * Nombre del usuario.
   */
  @Prop({ required: true })
  firstName: string;

  /**
   * Apellido del usuario.
   */
  @Prop({ required: true })
  lastName: string;

  /**
   * Correo electrónico único del usuario.
   */
  @Prop({ required: true, unique: true })
  email: string;

  /**
   * Indica si el usuario tiene privilegios de administrador.
   * @default false
   */
  @Prop({ type: Boolean, default: false })
  isAdmin: boolean;

  /**
   * Accesos a las aplicaciones del sistema.
   */
  @Prop({ type: Object, default: { catalog: false } })
  appAccess: Apps;

  /**
   * Hash de la contraseña del usuario.
   */
  @Prop({ required: true })
  passwordHash: string;

  /**
   * Token de acceso actual del usuario.
   * Puede ser nulo si el usuario no ha iniciado sesión.
   */
  @Prop({ type: String, default: null })
  accessToken: string | null;

  /**
   * Fecha de expiración del token de acceso.
   * Puede ser nulo si no hay token activo.
   */
  @Prop({ type: Date, default: null })
  accessTokenExpiresAt: Date | null;

  /**
   * Token de refresco actual del usuario.
   * Puede ser nulo si el usuario no ha iniciado sesión.
   */
  @Prop({ type: String, default: null })
  refreshToken: string | null;

  /**
   * Fecha de expiración del token de refresco.
   * Puede ser nulo si no hay token activo.
   */
  @Prop({ type: Date, default: null })
  refreshTokenExpiresAt: Date | null;

  /**
   * Código de recuperación para restablecer la contraseña.
   * Puede ser nulo si no se ha solicitado recuperación.
   */
  @Prop({ type: String, default: null })
  recoveryCode: string | null;

  /**
   * Fecha de expiración del código de recuperación.
   * Puede ser nulo si no se ha solicitado recuperación.
   */
  @Prop({ type: Date, default: null })
  recoveryCodeExpiresAt: Date | null;
}

/**
 * Esquema de Mongoose para la entidad User.
 */
export const UserSchema = SchemaFactory.createForClass(User);

export type Apps = {
  catalog: boolean;
};