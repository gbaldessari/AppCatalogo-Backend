import { Controller, Post, Get, Query, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { ImagesService, MulterFile } from './images.service';
import { GetImageByIdDto } from './dto/getImageById.dto';
import { Response } from 'express';

/**
 * Controlador para la gestión de imágenes.
 *
 * @remarks
 * Permite subir imágenes y obtenerlas por su identificador.
 */
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  /**
   * Sube una imagen al servidor.
   *
   * @param file - Archivo de imagen recibido en la petición.
   * @returns El identificador de la imagen almacenada.
   */
  @UseGuards(JwtAuthGuard)
  @Post('/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: MulterFile) {
    return this.imagesService.uploadImage(file);
  }

  /**
   * Obtiene una imagen por su identificador y la transmite en la respuesta HTTP.
   *
   * @param query - DTO con el identificador de la imagen.
   * @param res - Objeto de respuesta de Express.
   */
  @Get('/get-by-id')
  async getImageById(@Query() query: GetImageByIdDto, @Res() res: Response) {
    return this.imagesService.streamImageToResponse(query.imageId, res);
  }
}
