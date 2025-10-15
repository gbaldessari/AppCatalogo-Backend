import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Offer } from './schema/offer.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ImagesService } from 'src/images/images.service';
import { CreateOfferDto } from './dto/createOffer.dto';
import { UpdateOfferDto } from './dto/updateOffer.dto';
import { DeleteOfferDto } from './dto/deleteOffer.dto';

/**
 * Servicio para la gestión de ofertas.
 *
 * @remarks
 * Permite crear, obtener, actualizar y eliminar ofertas asociadas a productos.
 * Gestiona también la eliminación de imágenes asociadas a las ofertas.
 */
@Injectable()
export class OffersService {
  /**
   * Constructor del servicio de ofertas.
   *
   * @param offerModel - Modelo de Mongoose para la entidad Offer.
   * @param imagesService - Servicio de imágenes para gestionar imágenes asociadas a ofertas.
   */
  constructor(
    @InjectModel(Offer.name) private readonly offerModel: Model<Offer>,
    @Inject(ImagesService) private readonly imagesService: ImagesService,
  ) { }

  /**
   * Crea una nueva oferta para un producto.
   *
   * @param offerData - DTO con los datos de la oferta.
   * @throws ConflictException si ya existe una oferta para el producto.
   */
  async createOffer(offerData: CreateOfferDto): Promise<void> {
    const foundOffer = await this.offerModel.findOne({ productSku: offerData.productSku });
    if (foundOffer) {
      throw new ConflictException(`Offer for product with SKU ${offerData.productSku} already exists.`);
    }
    const newOffer = new this.offerModel(offerData);
    await newOffer.save();
  }

  /**
   * Obtiene todas las ofertas existentes.
   *
   * @returns Un arreglo de ofertas.
   */
  async getOffers(): Promise<Offer[]> {
    return this.offerModel.find().exec();
  }

  /**
   * Elimina una oferta de un producto y su imagen asociada.
   *
   * @param offerData - DTO con el SKU del producto cuya oferta se eliminará.
   * @throws NotFoundException si la oferta no existe.
   */
  async deleteOffer(offerData: DeleteOfferDto): Promise<void> {
    const foundOffer = await this.offerModel.findOne({ productSku: offerData.productSku });
    if (!foundOffer) {
      throw new NotFoundException(`Offer for product with SKU ${offerData.productSku} not found.`);
    }
    await this.imagesService.deleteImage(foundOffer.imageId);
    await this.offerModel.deleteOne({ productSku: offerData.productSku }).exec();
  }

  /**
   * Actualiza los datos de una oferta existente.
   *
   * @param offerData - DTO con los datos actualizados de la oferta.
   * @throws NotFoundException si la oferta no existe.
   */
  async updateOffer(offerData: UpdateOfferDto): Promise<void> {
    const foundOffer = await this.offerModel.findOne({ productSku: offerData.productSku });
    if (!foundOffer) {
      throw new NotFoundException(`Offer for product with SKU ${offerData.productSku} not found.`);
    }
    if (offerData.imageId !== foundOffer.imageId) {
      await this.imagesService.deleteImage(foundOffer.imageId);
      foundOffer.imageId = offerData.imageId;
    }
    if (offerData.newPrice !== foundOffer.newPrice) {
      foundOffer.newPrice = offerData.newPrice;
    }
    if (offerData.expiration !== foundOffer.expiration) {
      foundOffer.expiration = offerData.expiration;
    }
    await foundOffer.save();
  }
}
