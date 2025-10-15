/**
 * Data Transfer Object para actualizar una categoría.
 *
 * @remarks
 * Utilizado para recibir el identificador y el nuevo nombre de la categoría a actualizar.
 */
export class UpdateCategoryDto {
  /**
   * Id de la categoria.
   */
  _id: string;
  /**
   * Nombre de la categoria.
   */
  name: string;
}