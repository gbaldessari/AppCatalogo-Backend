/**
 * Data Transfer Object para el cambio de contraseña de un usuario.
 *
 * @remarks
 * Utilizado para recibir y validar los datos necesarios para cambiar la contraseña.
 */
export class ChangePasswordDto {
  /**
   * Contraseña actual del usuario.
   * Se utiliza para verificar la identidad antes de permitir el cambio.
   */
  currentPassword: string;

  /**
   * Nueva contraseña que se establecerá para el usuario.
   * Debe cumplir con los requisitos de seguridad definidos.
   */
  newPassword: string;
}
