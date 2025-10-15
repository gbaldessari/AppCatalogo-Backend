import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schema/product.schema';
import { ImagesModule } from 'src/images/images.module';
import { OffersModule } from 'src/offers/offers.module';

/**
 * Módulo para la gestión de productos.
 *
 * @remarks
 * Configura el esquema, controlador y servicio necesarios para administrar productos,
 * integrando imágenes y ofertas asociadas.
 */
@Module({
  imports: [
    // Esquema de Mongoose para la colección de productos.
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    // Importa el módulo de imágenes para asociar imágenes a los productos.
    ImagesModule,
    // Importa el módulo de ofertas para asociar ofertas a los productos.
    OffersModule,
  ],
  controllers: [
    // Controlador que maneja las rutas relacionadas con productos.
    ProductsController,
  ],
  providers: [
    // Servicio que contiene la lógica de negocio de productos.
    ProductsService,
  ],
  exports: [
    // Exporta el servicio para su uso en otros módulos.
    ProductsService,
  ],
})
export class ProductsModule { }
