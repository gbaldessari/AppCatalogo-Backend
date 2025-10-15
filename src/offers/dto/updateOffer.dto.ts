/**
 * Data Transfer Object para actualizar una oferta existente.
 *
 * @remarks
 * Utilizado para recibir los datos necesarios para modificar una oferta sobre un producto.
 */
export class UpdateOfferDto {
  /**
   * SKU del producto al que se aplica la oferta.
   */
  productSku: string;
  /**
   * Id de la imagen asociada a la oferta.
   */
  imageId: string;
  /**
   * Nuevo precio de la oferta.
   */
  newPrice: number;
  /**
   * Fecha de expiración de la oferta (opcional).
   */
  expiration?: Date;
}