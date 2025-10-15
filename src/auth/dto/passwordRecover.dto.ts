/**
 * Data Transfer Object para solicitar la recuperación de contraseña.
 *
 * @remarks
 * Utilizado para recibir el correo electrónico del usuario que solicita la recuperación.
 */
export class RequestPasswordRecoverDto {
  /**
   * Correo electrónico del usuario que solicita la recuperación de contraseña.
   */
  email: string;
}

/**
 * Data Transfer Object para confirmar la recuperación de contraseña.
 *
 * @remarks
 * Utilizado para validar el código de recuperación y establecer una nueva contraseña.
 */
export class RecoverPasswordDto {
  /**
   * Correo electrónico del usuario.
   */
  email: string;

  /**
   * Código de recuperación enviado al correo.
   */
  recoveryCode: string;

  /**
   * Nueva contraseña que se establecerá para el usuario.
   */
  newPassword: string;
}