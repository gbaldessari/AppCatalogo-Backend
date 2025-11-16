/**
 * Data Transfer Object para el registro de un nuevo usuario.
 *
 * @remarks
 * Utilizado para recibir y validar los datos necesarios para crear una nueva cuenta de usuario.
 */
export class RegisterDto {
  /**
   * Nombre del usuario.
   */
  firstName: string;

  /**
   * Apellido del usuario.
   */
  lastName: string;

  /**
   * Correo electrónico único del usuario.
   */
  email: string;

  /**
   * Contraseña del usuario.
   */
  password: string;
}
