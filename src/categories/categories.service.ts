import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './schema/category.shema';
import { isValidObjectId, Model } from 'mongoose';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { DeleteCategoryDto } from './dto/deleteCategory.dto';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { ProductsService } from 'src/products/products.service';
import { ImagesService } from 'src/images/images.service';

/**
 * Servicio para la gestión de categorías.
 *
 * @remarks
 * Proporciona métodos para crear, obtener, actualizar y eliminar categorías,
 * así como validaciones relacionadas con productos asociados.
 */
@Injectable()
export class CategoriesService {
  /**
   * Constructor del servicio de categorías.
   *
   * @param categoryModel - Modelo de Mongoose para la entidad Category.
   * @param productsService - Servicio de productos para validar dependencias.
   */
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<Category>,
    @Inject(ProductsService) private readonly productsService: ProductsService,
    @Inject(ImagesService) private readonly imagesService: ImagesService,
  ) { }

  /**
   * Crea una nueva categoría.
   *
   * @param categoryData - DTO con el nombre de la categoría.
   * @throws ConflictException si ya existe una categoría con el mismo nombre.
   */
  async createCategory(categoryData: CreateCategoryDto): Promise<void> {
    const foundCategory = await this.categoryModel.findOne({ name: categoryData.name });
    if (foundCategory) {
      throw new ConflictException(`Category with name ${categoryData.name} already exists.`);
    }
    const newCategory = new this.categoryModel(categoryData);
    await newCategory.save();
  }

  /**
   * Obtiene todas las categorías existentes.
   *
   * @returns Un arreglo de categorías.
   */
  async getCategories(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  /**
   * Actualiza el nombre de una categoría existente.
   *
   * @param categoryData - DTO con el id y el nuevo nombre de la categoría.
   * @throws BadRequestException si el id no es válido.
   * @throws NotFoundException si la categoría no existe.
   */
  async updateCategory(categoryData: UpdateCategoryDto): Promise<void> {
    if (!isValidObjectId(categoryData._id)) {
      throw new BadRequestException('El id de la categoría no es válido');
    }
    const foundCategory = await this.categoryModel.findById(categoryData._id);

    if (!foundCategory) {
      throw new NotFoundException(`Category with id ${categoryData._id} not found.`);
    }
    foundCategory.name = categoryData.name;
    await foundCategory.save();
  }

  /**
   * Elimina una categoría si no contiene productos asociados.
   *
   * @param categoryData - DTO con el id de la categoría a eliminar.
   * @throws BadRequestException si el id no es válido.
   * @throws NotFoundException si la categoría no existe.
   * @throws ConflictException si la categoría contiene productos asociados.
   */
  async deleteCategory(categoryData: DeleteCategoryDto): Promise<void> {
    if (!isValidObjectId(categoryData._id)) {
      throw new BadRequestException('El id de la categoría no es válido');
    }
    const foundCategory = await this.categoryModel.findById(categoryData._id);

    if (!foundCategory) {
      throw new NotFoundException(`Category with id ${categoryData._id} not found.`);
    }
    const productsInCategory = await this.productsService.findByCategoryId(categoryData._id);
    for (const product of productsInCategory) {
      await this.productsService.deleteProduct({ sku: product.sku });
    }
    await this.categoryModel.deleteOne({ _id: categoryData._id }).exec();
  }

  /**
   * Busca una categoría por su nombre.
   *
   * @param name - Nombre de la categoría a buscar.
   * @returns La categoría encontrada o null si no existe.
   */
  async findByName(name: string): Promise<Category | null> {
    return this.categoryModel.findOne({ name: { $regex: `^${name}$`, $options: 'i' } }).exec();
  }

  /**
   * Actualiza el diseño (color, portada, fondo) de una categoría.
   */
  async updateCategoryDesign(_id: string, design: { color?: string, frontPageId?: string | null, backgroundImageId?: string | null }): Promise<void> {
    if (!isValidObjectId(_id)) throw new BadRequestException('El id de la categoría no es válido');
    const foundCategory = await this.categoryModel.findById(_id);
    if (!foundCategory) throw new NotFoundException(`Category with id ${_id} not found.`);
    if (design.color !== undefined) foundCategory.color = design.color;
    if (typeof design.frontPageId !== 'undefined' && design.frontPageId !== foundCategory.frontPageId) {
      if (foundCategory.frontPageId) {
        await this.imagesService.deleteImage(foundCategory.frontPageId);
      }
      foundCategory.frontPageId = design.frontPageId === null ? null : design.frontPageId;
    }
    if (typeof design.backgroundImageId !== 'undefined' && design.backgroundImageId !== foundCategory.backgroundImageId) {
      if (foundCategory.backgroundImageId) {
        await this.imagesService.deleteImage(foundCategory.backgroundImageId);
      }
      foundCategory.backgroundImageId = design.backgroundImageId === null ? null : design.backgroundImageId;
    }
    await foundCategory.save();
  }

  /**
   * Obtiene el diseño de todas las categorías (color, portada, fondo).
   */
  async getCategoriesDesign(): Promise<{ _id: string, color: string, frontPageId: string | null, backgroundImageId: string | null }[]> {
    const categories = await this.categoryModel.find().exec();
    return categories.map(cat => ({
      _id: String(cat._id),
      color: cat.color,
      frontPageId: cat.frontPageId,
      backgroundImageId: cat.backgroundImageId,
    }));
  }

  async getCategoryDesignById(categoryId: string): Promise<{ color: string, frontPageId: string | null, backgroundImageId: string | null } | null> {
    if (!isValidObjectId(categoryId)) throw new BadRequestException('El id de la categoría no es válido');
    const foundCategory = await this.categoryModel.findById(categoryId);
    if (!foundCategory) return null;
    return {
      color: foundCategory.color,
      frontPageId: foundCategory.frontPageId,
      backgroundImageId: foundCategory.backgroundImageId,
    };
  }
}
