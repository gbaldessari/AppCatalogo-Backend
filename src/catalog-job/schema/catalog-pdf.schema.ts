import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';


@Schema()
export class PDF extends Document {
  /**
   * Id del archivo en GridFS.
   */
  @Prop({ required: true })
  fileId: string;

  /**
   * Nombre del archivo.
   */
  @Prop({ required: true })
  fileName: string;

  /**
   * Tipo de archivo.
   */
  @Prop({ required: true })
  contentType: string;
}

export const PDFSchema = SchemaFactory.createForClass(PDF);