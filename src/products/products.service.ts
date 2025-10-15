import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schema/product.schema';
import { Model } from 'mongoose';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { DeleteManyProductsDto, DeleteProductDto } from './dto/deleteProduct.dto';
import { ImagesService } from 'src/images/images.service';
import { OffersService } from 'src/offers/offers.service';

/**
 * Servicio para la gestión de productos.
 *
 * @remarks
 * Permite crear, obtener, actualizar y eliminar productos, así como gestionar imágenes y ofertas asociadas.
 */
@Injectable()
export class ProductsService {

  /**
   * Constructor del servicio de productos.
   *
   * @param productModel - Modelo de Mongoose para la entidad Product.
   * @param imagesService - Servicio de imágenes para gestionar imágenes asociadas a productos.
   * @param offersService - Servicio de ofertas para gestionar ofertas asociadas a productos.
   */
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
    @Inject(ImagesService) private readonly imagesService: ImagesService,
    @Inject(OffersService) private readonly offersService: OffersService,
  ) { }

  /**
   * Crea un nuevo producto.
   *
   * @param productData - DTO con los datos del producto.
   * @throws ConflictException si ya existe un producto con el mismo SKU.
   */
  async createProduct(productData: CreateProductDto): Promise<void> {
    const foundProduct = await this.productModel.findOne({ sku: productData.sku });
    if (foundProduct) {
      throw new ConflictException(`Product with SKU ${productData.sku} already exists.`);
    }
    const newProduct = new this.productModel(productData);
    await newProduct.save();
  }

  /**
   * Obtiene todos los productos existentes.
   *
   * @returns Un arreglo de productos.
   */
  async getProducts(): Promise<Product[]> {
    return this.productModel.find().exec();
  }

  /**
   * Actualiza los datos de un producto existente.
   *
   * @param productData - DTO con los datos actualizados del producto.
   * @throws NotFoundException si el producto no existe.
   */
  async updateProduct(productData: UpdateProductDto): Promise<void> {
    const foundProduct = await this.productModel.findOne({ sku: productData.sku });
    if (!foundProduct) {
      throw new NotFoundException(`Product with SKU ${productData.sku} not found.`);
    }
    if (productData.name !== foundProduct.name) {
      foundProduct.name = productData.name;
    }
    if (productData.catalogueName !== foundProduct.catalogueName) {
      foundProduct.catalogueName = productData.catalogueName;
    }
    if (productData.isActive !== foundProduct.isActive) {
      foundProduct.isActive = productData.isActive;
    }
    if (productData.units !== foundProduct.units) {
      foundProduct.units = productData.units;
    }
    if (productData.categoryId !== foundProduct.categoryId) {
      foundProduct.categoryId = productData.categoryId;
    }
    if (productData.imageId !== foundProduct.imageId) {
      await this.imagesService.deleteImage(foundProduct.imageId);
      foundProduct.imageId = productData.imageId;
    }
    if (productData.price !== foundProduct.price) {
      foundProduct.price = productData.price;
    }
    await foundProduct.save();
  }

  /**
   * Elimina un producto, su imagen y su oferta asociada.
   *
   * @param productData - DTO con el identificador del producto a eliminar.
   * @throws NotFoundException si el producto no existe.
   */
  async deleteProduct(productData: DeleteProductDto): Promise<void> {
    const foundProduct = await this.productModel.findOne({ sku: productData.sku });
    if (!foundProduct) {
      throw new NotFoundException(`Product with SKU ${productData.sku} not found.`);
    }
    try {
      await this.offersService.deleteOffer({ productSku: productData.sku });
    }
    catch (error) {
      console.error(`Error deleting offer for product with SKU ${productData.sku}:`, error);
    }
    try {
      await this.imagesService.deleteImage(foundProduct.imageId);
    } catch (error) {
      console.error(`Error deleting image for product with SKU ${productData.sku}:`, error);
    }
    await this.productModel.deleteOne({ sku: productData.sku });
  }

  async deleteManyProducts(productData: DeleteManyProductsDto): Promise<void> {
    const skus = productData.skus;
    const foundProducts = await this.productModel.find({ sku: { $in: skus } });
    if (foundProducts.length === 0) {
      throw new NotFoundException(`No products found for SKUs: ${skus.join(', ')}`);
    }
    try {
      await Promise.all(foundProducts.map(product => this.offersService.deleteOffer({ productSku: product.sku })));
    } catch (error) {
      console.error(`Error deleting offers for products with SKUs ${skus.join(', ')}:`, error);
    }
    try {
      await Promise.all(foundProducts.map(product => this.imagesService.deleteImage(product.imageId)));
    } catch (error) {
      console.error(`Error deleting images for products with SKUs ${skus.join(', ')}:`, error);
    }
    await this.productModel.deleteMany({ sku: { $in: skus } });
  }

  /**
   * Busca productos por el identificador de la categoría.
   *
   * @param categoryId - Id de la categoría.
   * @returns Un arreglo de productos que pertenecen a la categoría.
   */
  async findByCategoryId(categoryId: string): Promise<Product[]> {
    return this.productModel.find({ categoryId }).exec();
  }
  async findBySku(sku: string): Promise<Product | null> {
    return this.productModel.findOne({ sku }).exec();
  }
  async activateProduct(sku: string): Promise<void> {
    const product = await this.findBySku(sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU (flex) ${sku} not found.`);
    }
    if (!product.isActive) {
      product.isActive = true;
      await product.save();
    }
  }

  async deactivateProduct(sku: string): Promise<void> {
    const product = await this.findBySku(sku);
    if (!product) {
      throw new NotFoundException(`Product with SKU (flex) ${sku} not found.`);
    }
    if (product.isActive) {
      product.isActive = false;
      await product.save();
    }
  }
}
