/**
 * Data Transfer Object para la creación de una nueva categoría.
 *
 * @remarks
 * Utilizado para recibir y validar el nombre de la categoría a crear.
 */
export class CreateCategoryDto {
  /**
   * Nombre de la categoría.
   */
  name: string;
}