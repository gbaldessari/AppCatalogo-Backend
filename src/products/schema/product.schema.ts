import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Esquema de Mongoose que representa un producto en la base de datos.
 *
 * @remarks
 * Utilizado para almacenar los datos de productos, incluyendo identificador, nombre, categoría, imagen y precio.
 *
 * @extends Document
 */
@Schema()
export class Product extends Document {
  /**
   * Identificador único del producto.
   */
  @Prop({ required: true, unique: true })
  sku: string;
  /**
   * Nombre del producto.
   */
  @Prop({ required: true })
  name: string;
  /**
   * Nombre de catálogo del producto.
   */
  @Prop({ required: true })
  catalogueName: string;
  /**
   * Indica si el producto está activo.
   * Si es false, el producto no será visible en la tienda.
   */
  @Prop({ default: true })
  isActive: boolean;
  /**
   * Unidades de venta del producto.
   */
  @Prop({ required: true })
  units: number;
  /**
   * Id de la categoria a la que pertenece el producto.
   */
  @Prop({ required: true })
  categoryId: string;
  /**
   * Id de la imagen asociada al producto.
   */
  @Prop({ required: true })
  imageId: string;
  /**
   * Precio del producto.
   */
  @Prop({ required: true })
  price: number;
}

/**
 * Esquema de Mongoose para la entidad Product.
 */
export const ProductSchema = SchemaFactory.createForClass(Product);