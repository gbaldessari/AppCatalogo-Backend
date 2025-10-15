import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { GenerateCatalogWithIdsDto } from 'src/generate-catalog/dto/generateCatalog.dto';

@Schema({ timestamps: true })
export class CatalogJob extends Document {
  @Prop({ default: 'pending' })
  status: 'pending' | 'processing' | 'done' | 'error';

  @Prop()
  error?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop()
  catalogData: GenerateCatalogWithIdsDto;

  @Prop({ type: Object })
  pdfFileIds?: any;

  @Prop({ required: true }) 
  fileName: string;
}

export const CatalogJobSchema = SchemaFactory.createForClass(CatalogJob);