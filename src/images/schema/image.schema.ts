import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Esquema de Mongoose que representa una imagen almacenada en la base de datos.
 *
 * @remarks
 * Utilizado para gestionar los metadatos de archivos almacenados en GridFS.
 *
 * @extends Document
 */
@Schema()
export class Image extends Document {
  /**
   * Id del archivo en GridFS.
   */
  @Prop({ required: true })
  fileId: string;

  /**
   * Nombre del archivo.
   */
  @Prop({ required: true })
  filename: string;

  /**
   * Tipo de archivo.
   */
  @Prop({ required: true })
  contentType: string;
}

/**
 * Esquema de Mongoose para la entidad Image.
 */
export const ImageSchema = SchemaFactory.createForClass(Image);