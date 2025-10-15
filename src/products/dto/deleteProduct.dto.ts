/**
 * Data Transfer Object para eliminar un producto.
 *
 * @remarks
 * Utilizado para recibir el identificador único del producto que se desea eliminar.
 */
export class DeleteProductDto {
  /**
   * Identificador único del producto.
   */
  sku: string;
}

/**
 * Data Transfer Object para eliminar múltiples productos.
 *
 * @remarks
 * Utilizado para recibir un arreglo de identificadores únicos de los productos que se desean eliminar.
 */
export class DeleteManyProductsDto {
  /**
   * Arreglo de identificadores únicos de los productos.
   */
  skus: string[];
}