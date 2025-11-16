import { Apps } from "../schema/user.schema";

/**
 * Data Transfer Object para manejar los datos de inicio de sesión de un usuario.
 *
 * @remarks
 * Utilizado para recibir y validar las credenciales de acceso.
 */
export class LoginDto {
  /**
   * Correo electrónico del usuario.
   */
  email: string;

  /**
   * Contraseña del usuario.
   */
  password: string;
}

/**
 * Data Transfer Object para la respuesta del inicio de sesión.
 *
 * @remarks
 * Devuelve los tokens y datos básicos del usuario tras un inicio de sesión exitoso.
 */
export class LoginResponseDto {
  /**
   * Token de acceso generado tras un inicio de sesión exitoso.
   */
  accessToken: string;

  /**
   * Token de refresco generado junto con el token de acceso.
   */
  refreshToken: string;

  /**
   * Nombre del usuario.
   */
  firstName: string;

  /**
   * Apellido del usuario.
   */
  lastName: string;

  /**
   * Indica si el usuario tiene permisos de administrador.
   */
  isAdmin: boolean;

  /**
   * Accesos a las aplicaciones del usuario.
   */
  appAccess: Apps;
}
