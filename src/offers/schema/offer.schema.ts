import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Esquema de Mongoose que representa una oferta en la base de datos.
 *
 * @remarks
 * Utilizado para almacenar las ofertas asociadas a productos, incluyendo imagen, precio y expiración.
 *
 * @extends Document
 */
@Schema()
export class Offer extends Document {
  /**
   * SKU del producto al que se aplica la oferta.
   */
  @Prop({ required: true, unique: true })
  productSku: string;

  /**
   * Id de la imagen asociada a la oferta.
   */
  @Prop({ required: true })
  imageId: string;

  /**
   * Nuevo precio del producto en oferta.
   */
  @Prop({ required: true })
  newPrice: number;

  /**
   * Fecha de expiración del producto en oferta.
   * Si no se especifica, la oferta no depende de la fecha de expiración del producto.
   */
  @Prop({ required: false })
  expiration?: Date;
}

/**
 * Esquema de Mongoose para la entidad Offer.
 */
export const OfferSchema = SchemaFactory.createForClass(Offer);