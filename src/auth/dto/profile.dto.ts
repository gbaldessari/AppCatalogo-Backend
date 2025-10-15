/**
 * Data Transfer Object para la respuesta del perfil del usuario.
 *
 * @remarks
 * Devuelve los datos básicos del perfil del usuario autenticado.
 */
export class ProfileResponseDto {
  /**
   * Nombre del usuario.
   */
  firstName: string;

  /**
   * Apellido del usuario.
   */
  lastName: string;

  /**
   * Correo electrónico del usuario.
   */
  email: string;
}
