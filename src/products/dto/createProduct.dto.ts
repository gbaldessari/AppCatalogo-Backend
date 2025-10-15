/**
 * Data Transfer Object para la creación de un producto.
 *
 * @remarks
 * Utilizado para recibir y validar los datos necesarios para registrar un nuevo producto.
 */
export class CreateProductDto {
  /**
   * Identificador único del producto.
   */
  sku: string;
  /**
   * Nombre del producto.
   */
  name: string;
  /**
   * Nombre de catálogo del producto.
   */
  catalogueName: string;
  /**
   * Unidades de venta del producto.
   */
  units: number;
  /**
   * Id de la categoria a la que pertenece el producto.
   */
  categoryId: string;
  /**
   * Id de la imagen asociada al producto.
   */
  imageId: string;
  /**
   * Precio del producto.
   */
  price: number;
}