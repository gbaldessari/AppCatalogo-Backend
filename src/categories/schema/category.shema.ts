import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Esquema de Mongoose que representa una categoría en la base de datos.
 *
 * @remarks
 * Utilizado para almacenar y gestionar las categorías de productos o servicios.
 *
 * @extends Document
 */
@Schema()
export class Category extends Document {
  /**
   * Nombre de la categoría.
   */
  @Prop({ required: true })
  name: string;

  /**
   * Color de la categoría.
   */
  @Prop({ type: String, default: '#000000' })
  color: string;

  /**
   * Portada de la categoría (ID de la imagen).
   */
  @Prop({ type: String, default: null })
  frontPageId: string | null;

  /**
   * Fondo de la categoría (ID de la imagen).
   */
  @Prop({ type: String, default: null })
  backgroundImageId: string | null;
}

/**
 * Esquema de Mongoose para la entidad Category.
 */
export const CategorySchema = SchemaFactory.createForClass(Category);