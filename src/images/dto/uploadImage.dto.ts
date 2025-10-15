/**
 * Data Transfer Object para la respuesta al subir una imagen.
 *
 * @remarks
 * Devuelve el identificador único de la imagen almacenada.
 */
export class UploadImageResponseDto {
  /**
   * Identificador único de la imagen almacenada.
   */
  imageId: string;
}