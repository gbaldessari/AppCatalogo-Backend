import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { OffersService } from './offers.service';
import { DeleteOfferDto } from './dto/deleteOffer.dto';
import { CreateOfferDto } from './dto/createOffer.dto';
import { UpdateOfferDto } from './dto/updateOffer.dto';

/**
 * Controlador para la gestión de ofertas.
 *
 * @remarks
 * Expone endpoints protegidos para crear, obtener, actualizar y eliminar ofertas de productos.
 */
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  /**
   * Crea una nueva oferta para un producto.
   *
   * @param createOfferDto - DTO con los datos de la oferta.
   * @returns La oferta creada.
   */
  @Post('create')
  async createProduct(@Body() createOfferDto: CreateOfferDto) {
    return this.offersService.createOffer(createOfferDto);
  }

  /**
   * Obtiene todas las ofertas existentes.
   *
   * @returns Lista de ofertas.
   */
  @Get('get')
  async getProducts() {
    return this.offersService.getOffers();
  }

  /**
   * Actualiza una oferta existente.
   *
   * @param updateOfferDto - DTO con los datos actualizados de la oferta.
   * @returns La oferta actualizada.
   */
  @Patch('update')
  async updateProduct(@Body() updateOfferDto: UpdateOfferDto) {
    return this.offersService.updateOffer(updateOfferDto);
  }

  /**
   * Elimina una oferta de un producto.
   *
   * @param deleteOfferDto - DTO con el SKU del producto cuya oferta se eliminará.
   * @returns Resultado de la operación de eliminación.
   */
  @Delete('delete')
  async deleteProduct(@Query() deleteOfferDto: DeleteOfferDto) {
    return this.offersService.deleteOffer(deleteOfferDto);
  }
}
