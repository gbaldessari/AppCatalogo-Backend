import { Module } from '@nestjs/common';
import { GenerateCatalogService } from './generate-catalog.service';
import { ProductsModule } from 'src/products/products.module';
import { OffersModule } from 'src/offers/offers.module';
import { CategoriesModule } from 'src/categories/categories.module';
import { ImagesModule } from 'src/images/images.module';

/**
 * Módulo para la generación de catálogos en PDF.
 *
 * @remarks
 * Configura los controladores y servicios necesarios para la generación de catálogos personalizados,
 * integrando productos, ofertas, categorías e imágenes.
 */
@Module({
  imports: [
    ProductsModule,
    OffersModule,
    CategoriesModule,
    ImagesModule,
  ],
  providers: [GenerateCatalogService],
  exports: [GenerateCatalogService],
})
export class GenerateCatalogModule {}
