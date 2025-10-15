/**
 * Data Transfer Object para actualizar un producto existente.
 *
 * @remarks
 * Utilizado para recibir y validar los datos necesarios para modificar un producto.
 */
export class UpdateProductDto {
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
   * Indica si el producto está activo.
   * Si es false, el producto no será visible en la tienda.
   */
  isActive: boolean;
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