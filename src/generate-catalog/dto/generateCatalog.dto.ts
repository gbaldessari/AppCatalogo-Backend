import { MulterFile } from "src/images/images.service";

/**
 * Interfaz que representa la información de una categoría para la generación del catálogo.
 *
 * @property _id - Id de la categoría.
 * @property color - Color de la categoría en formato hexadecimal.
 * @property frontPage - Imagen de portada de la categoría.
 * @property backgroundImage - Imagen de fondo de la categoría.
 */
export interface CategoryPayload {
  /**
   * Id de la categoría.
   */
  _id: string;
  /**
   * Color de la categoría en formato hexadecimal.
   */
  color: string;
  /**
   * Imagen de portada de la categoría.
   */
  frontPage: MulterFile | null;
  /**
   * Imagen de fondo de la categoría.
   */
  backgroundImage: MulterFile | null;
}

/**
 * Data Transfer Object para la generación de un catálogo.
 *
 * @remarks
 * Contiene las imágenes principales y la información de las categorías a incluir en el catálogo.
 */
export class GenerateCatalogDto {
  /**
   * Imagen de portada del catálogo.
   */
  frontPage:  MulterFile | null;
  /**
   * Imágenes extra del catálogo.
   */
  extraImages:  MulterFile[] | null;
  /**
   * Imagen de contraportada del catálogo.
   */
  backPage:  MulterFile | null;
  /**
   * Categorías del catálogo con sus colores y archivos de imagen.
   */
  categoriesPayload:  CategoryPayload[] | null;
  /**
   * Indica si se deben mostrar los precios de los productos en el catálogo.
   */
  visiblePrices: boolean;
  /**
   * Indica si se deben mostrar las ofertas de los productos en el catálogo.
   */
  visibleOffers: boolean;
  /**
   * Nombre del archivo del catálogo.
   */
  fileName: string;
}

export class CategoriesPayloadWithIds {
  _id: string;
  color: string;
  frontPageId?: string | null;
  backgroundImageId?: string | null;
};
export class GenerateCatalogWithIdsDto {
  frontPageId: string | null;
  backPageId: string | null;
  extraImagesIds: string[];
  categoriesPayloadWithIds: CategoriesPayloadWithIds[];
  visiblePrices: boolean;
  visibleOffers: boolean;
  fileName: string;
}