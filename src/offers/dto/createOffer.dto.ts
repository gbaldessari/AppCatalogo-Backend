/**
 * Data Transfer Object para la creación de una oferta.
 *
 * @remarks
 * Utilizado para recibir los datos necesarios para crear una nueva oferta sobre un producto.
 */
export class CreateOfferDto {
  /**
   * SKU del producto al que se aplica la oferta.
   */
  productSku: string;

  /**
   * Identificador de la imagen asociada a la oferta.
   */
  imageId: string;

  /**
   * Nuevo precio del producto en oferta.
   */
  newPrice: number;

  /**
   * Fecha de expiración de la oferta (opcional).
   */
  expiration?: Date;
}