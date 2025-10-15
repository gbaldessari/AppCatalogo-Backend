import { Module } from '@nestjs/common';
import { BulkUploadService } from './bulk-upload.service';
import { BulkUploadController } from './bulk-upload.controller';
import { ProductsModule } from 'src/products/products.module';
import { ImagesModule } from 'src/images/images.module';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  imports: [
    ImagesModule,
    ProductsModule,
    CategoriesModule,
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
})
export class BulkUploadModule {}
