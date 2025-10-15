import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Image } from './schema/image.schema';
import { Response } from 'express';
import { UploadImageResponseDto } from './dto/uploadImage.dto';
import * as sharp from 'sharp';

/**
 * Interfaz que representa un archivo recibido por Multer.
 */
export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Servicio para la gestión de imágenes.
 *
 * @remarks
 * Permite subir, obtener y eliminar imágenes almacenadas en GridFS y su metadata en MongoDB.
 */
@Injectable()
export class ImagesService {
  private gridFSBucket: GridFSBucket;

  /**
   * Inicializa el servicio de imágenes y el bucket de GridFS.
   *
   * @param connection - Conexión a la base de datos MongoDB.
   * @param imageModel - Modelo de Mongoose para la entidad Image.
   */
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Image.name) private readonly imageModel: Model<Image>,
  ) {
    this.gridFSBucket = new GridFSBucket(this.connection.db!, {
      bucketName: 'images',
    });
  }

  /**
   * Sube una imagen a GridFS y almacena su metadata en la base de datos.
   *
   * @param imageData - Archivo recibido por Multer.
   * @returns El identificador de la imagen almacenada.
   */
  async uploadImage(imageData: MulterFile): Promise<UploadImageResponseDto> {
    // Convertir la imagen a JPEG usando sharp
    const jpegBuffer = await sharp(imageData.buffer)
      .jpeg({ quality: 80 })
      .toBuffer();

    // Cambiar el mimetype y la extensión
    const originalName = imageData.originalname.replace(/\.[^/.]+$/, '');
    const jpegName = `${originalName}.jpg`;

    const uploadStream = this.gridFSBucket.openUploadStream(jpegName, {
      contentType: 'image/jpeg',
    });

    uploadStream.end(jpegBuffer);

    return new Promise(async (resolve, reject) => {
      uploadStream.on('finish', async () => {
        interface CreatedImage extends Image {
          _id: Types.ObjectId;
        }
        interface UploadImageResult {
          imageId: string;
        }
        const image = await this.imageModel.create({
          fileId: uploadStream.id,
          filename: jpegName,
          contentType: 'image/jpeg',
        }) as CreatedImage;
        resolve({ imageId: image._id.toString() } as UploadImageResult);
      });

      uploadStream.on('error', (err) => reject(err));
    });
  }

  /**
   * Transmite una imagen almacenada en GridFS a través de la respuesta HTTP.
   *
   * @param imageId - Identificador de la imagen.
   * @param res - Objeto de respuesta de Express.
   * @throws NotFoundException si la imagen no existe.
   */
  async streamImageToResponse(imageId: string, res: Response): Promise<void> {
    const image = await this.imageModel.findById(imageId);
    if (!image) throw new NotFoundException('Imagen no encontrada');

    const stream = this.gridFSBucket.openDownloadStream(new Types.ObjectId(image.fileId));
    res.setHeader('Content-Type', image.contentType);
    stream.pipe(res);
  }

  /**
   * Elimina una imagen de la base de datos y de GridFS.
   *
   * @param imageId - Identificador de la imagen.
   * @throws NotFoundException si la imagen no existe.
   */
  async deleteImage(imageId: string): Promise<void> {
    const image = await this.imageModel.findById(imageId);
    if (!image) throw new NotFoundException('Imagen no encontrada');

    await this.imageModel.deleteOne({ _id: imageId });
    await this.gridFSBucket.delete(new Types.ObjectId(image.fileId));
  }
}
