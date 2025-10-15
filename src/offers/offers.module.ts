import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from './schema/offer.schema';
import { ImagesModule } from 'src/images/images.module';

/**
 * Módulo para la gestión de ofertas.
 *
 * @remarks
 * Configura el esquema, controlador y servicio necesarios para administrar ofertas de productos.
 */
@Module({
  imports: [
    // Esquema de Mongoose para la colección de ofertas.
    MongooseModule.forFeature([{ name: Offer.name, schema: OfferSchema }]),
    // Importa el módulo de imágenes para asociar imágenes a las ofertas.
    ImagesModule,
  ],
  controllers: [
    // Controlador que maneja las rutas relacionadas con ofertas.
    OffersController,
  ],
  providers: [
    // Servicio que contiene la lógica de negocio de ofertas.
    OffersService,
  ],
  exports: [
    // Exporta el servicio para su uso en otros módulos.
    OffersService,
  ],
})
export class OffersModule { }
