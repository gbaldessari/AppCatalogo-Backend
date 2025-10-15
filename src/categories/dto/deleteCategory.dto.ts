/**
 * Data Transfer Object para eliminar una categoría.
 *
 * @remarks
 * Utilizado para recibir el identificador de la categoría que se desea eliminar.
 */
export class DeleteCategoryDto {
  /**
   * Id de la categoría a eliminar.
   */
  _id: string;
}