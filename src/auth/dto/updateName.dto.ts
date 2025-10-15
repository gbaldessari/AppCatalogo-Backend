/**
 * Data Transfer Object para actualizar el nombre y apellido del usuario.
 *
 * @remarks
 * Utilizado para recibir los nuevos valores de nombre y apellido del usuario autenticado.
 */
export class UpdateNameDto { 
  /**
   * Nuevo nombre del usuario.
   */
  firstName: string;

  /**
   * Nuevo apellido del usuario.
   */
  lastName: string;
}