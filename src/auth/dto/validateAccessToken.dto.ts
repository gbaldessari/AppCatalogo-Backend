/**
 * Data Transfer Object para la respuesta al validar un token de acceso.
 *
 * @remarks
 * Devuelve la fecha y hora de expiración del token de acceso validado.
 */
export class ValidateAccessTokenResponseDto {
  /**
   * Fecha y hora en la que expira el token de acceso.
   */
  expiresAt: Date;
}