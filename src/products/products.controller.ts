import { Body, Controller, Delete, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { CreateProductDto } from './dto/createProduct.dto';
import { DeleteManyProductsDto, DeleteProductDto } from './dto/deleteProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';

/**
 * Controlador para la gestión de productos.
 *
 * @remarks
 * Expone endpoints protegidos para crear, obtener, actualizar y eliminar productos.
 */
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  /**
   * Crea un nuevo producto.
   *
   * @param createProductDto - DTO con los datos del producto.
   * @returns El producto creado.
   */
  @Post('create')
  async createProduct(@Body() createProductDto: CreateProductDto) {
   return this.productsService.createProduct(createProductDto);
  }

  /**
   * Obtiene todos los productos existentes.
   *
   * @returns Lista de productos.
   */
  @Get('get')
  async getProducts() {
    return this.productsService.getProducts();
  }

  /**
   * Actualiza un producto existente.
   *
   * @param updateProductDto - DTO con los datos actualizados del producto.
   * @returns El producto actualizado.
   */
  @Patch('update')
  async updateProduct(@Body() updateProductDto: UpdateProductDto) {
   return this.productsService.updateProduct(updateProductDto);
  }

  /**
   * Elimina un producto.
   *
   * @param deleteProductDto - DTO con el identificador del producto a eliminar.
   * @returns Resultado de la operación de eliminación.
   */
  @Delete('delete')
  async deleteProduct(@Query() deleteProductDto: DeleteProductDto) {
   return this.productsService.deleteProduct(deleteProductDto);
  }

  /**
   * Elimina múltiples productos.
   *
   * @param deleteManyProductsDto - DTO con los identificadores de los productos a eliminar.
   * @returns Resultado de la operación de eliminación.
   */
  @Post('delete-many')
  async deleteManyProducts(@Body() deleteManyProductsDto: DeleteManyProductsDto) {
   return this.productsService.deleteManyProducts(deleteManyProductsDto);
  }
}
