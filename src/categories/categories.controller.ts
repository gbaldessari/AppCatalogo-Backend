import { Body, Controller, Delete, Get, Patch, Post, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/createCategory.dto';
import { UpdateCategoryDto } from './dto/updateCategory.dto';
import { DeleteCategoryDto } from './dto/deleteCategory.dto';

/**
 * Controlador para gestionar las operaciones sobre categorías.
 *
 * @remarks
 * Expone endpoints protegidos para crear, obtener, actualizar y eliminar categorías.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Crea una nueva categoría.
   *
   * @param createCategoryDto - DTO con el nombre de la categoría.
   * @returns La categoría creada.
   */
  @Post('create')
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
   return this.categoriesService.createCategory(createCategoryDto);
  }

  /**
   * Obtiene todas las categorías.
   *
   * @returns Lista de categorías existentes.
   */
  @Get('get')
  async getCategories() {
    return this.categoriesService.getCategories();
  }

  /**
   * Actualiza una categoría existente.
   *
   * @param updateCategoryDto - DTO con el id y el nuevo nombre de la categoría.
   * @returns La categoría actualizada.
   */
  @Patch('update')
  async updateCategory(@Body() updateCategoryDto: UpdateCategoryDto) {
   return this.categoriesService.updateCategory(updateCategoryDto);
  }

  /**
   * Elimina una categoría.
   *
   * @param deleteCategoryDto - DTO con el id de la categoría a eliminar.
   * @returns Resultado de la operación de eliminación.
   */
  @Delete('delete')
  async deleteCategory(@Query() deleteCategoryDto: DeleteCategoryDto) {
   return this.categoriesService.deleteCategory(deleteCategoryDto);
  }

  /**
   * Endpoint para obtener el diseño de todas las categorías (color, portada, fondo).
   */
  @Get('get-designs')
  async getCategoriesDesign() {
    return this.categoriesService.getCategoriesDesign();
  }
}
