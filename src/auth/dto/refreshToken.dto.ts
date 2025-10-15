/**
 * Data Transfer Object para solicitar un nuevo token de actualización.
 *
 * @remarks
 * Utilizado para recibir el token de actualización y generar un nuevo token de acceso.
 */
export class RefreshTokenDto {
  /**
   * Token de actualización proporcionado por el usuario.
   */
  refreshToken: string;
}

/**
 * Data Transfer Object para la respuesta al solicitar un nuevo token de acceso.
 *
 * @remarks
 * Devuelve el nuevo token de acceso y el nuevo token de actualización.
 */
export class RefreshTokenResponseDto {
  /**
   * Nuevo token de acceso generado.
   */
  accessToken: string;

  /**
   * Nuevo token de actualización generado.
   */
  refreshToken: string;
}