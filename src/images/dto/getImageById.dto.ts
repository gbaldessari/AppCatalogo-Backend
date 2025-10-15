/**
 * Data Transfer Object para obtener una imagen por su identificador.
 *
 * @remarks
 * Utilizado para recibir el ID único de la imagen que se desea recuperar.
 */
export class GetImageByIdDto {
  /**
   * Identificador único de la imagen.
   */
  imageId: string;
}