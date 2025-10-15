import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schema/category.shema';
import { ProductsModule } from 'src/products/products.module';
import { ImagesModule } from 'src/images/images.module';

/**
 * Módulo para la gestión de categorías.
 *
 * @remarks
 * Configura los esquemas, controladores y servicios necesarios para la administración de categorías.
 */
@Module({
  imports: [
    // Esquema de Mongoose para la colección de categorías.
    MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }]),
    // Importa el módulo de productos para la relación entre productos y categorías.
    ProductsModule,
    ImagesModule,
  ],
  controllers: [
    // Controlador que maneja las rutas relacionadas con categorías.
    CategoriesController,
  ],
  providers: [
    // Servicio que contiene la lógica de negocio de categorías.
    CategoriesService,
  ],
  exports: [
    // Exporta el servicio para su uso en otros módulos.
    CategoriesService,
  ],
})
export class CategoriesModule {}
