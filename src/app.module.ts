import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailModule } from './email/email.module';
import { ProductsModule } from './products/products.module';
import { OffersModule } from './offers/offers.module';
import { CategoriesModule } from './categories/categories.module';
import { ImagesModule } from './images/images.module';
import { GenerateCatalogModule } from './generate-catalog/generate-catalog.module';
import { BulkUploadModule } from './bulk-upload/bulk-upload.module';
import { CatalogJobModule } from './catalog-job/catalog-job.module';

/**
 * Módulo raíz de la aplicación.
 *
 * @remarks
 * Organiza y configura los módulos principales, la conexión a la base de datos y la carga de variables de entorno.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || ''),
    AuthModule,
    EmailModule,
    ProductsModule,
    OffersModule,
    CategoriesModule,
    ImagesModule,
    GenerateCatalogModule,
    BulkUploadModule,
    CatalogJobModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
