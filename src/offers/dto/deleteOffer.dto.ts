/**
 * Data Transfer Object para eliminar una oferta.
 *
 * @remarks
 * Utilizado para recibir el SKU del producto cuya oferta se desea eliminar.
 */
export class DeleteOfferDto {
  /**
   * SKU del producto al que se aplica la oferta.
   */
  productSku: string;
}