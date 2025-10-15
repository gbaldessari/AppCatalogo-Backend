import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CatalogJob } from '../schema/catalog-job.schema';
import { GenerateCatalogService } from 'src/generate-catalog/generate-catalog.service';
import { CatalogJobService } from '../catalog-job.service';
import { ImagesService } from 'src/images/images.service';

@Injectable()
export class CatalogJobProcessor {
  private readonly logger = new Logger(CatalogJobProcessor.name);

  constructor(
    @InjectModel(CatalogJob.name) private catalogJobModel: Model<CatalogJob>,
    private readonly generateCatalogService: GenerateCatalogService,
    private readonly catalogJobService: CatalogJobService,
    private readonly imagesService: ImagesService,
  ) { }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleCron() {
    const job = await this.catalogJobModel.findOneAndUpdate(
      { status: 'pending' },
      { status: 'processing' }
    );
    if (!job) return;

    try {
      this.logger.log(`Procesando job ${job._id}`);
      // NUEVO: Generar PDFs múltiples
      const pdfs = await this.generateCatalogService.generateCatalogMultiPdf(job.catalogData);

      const db = this.catalogJobService['connection']?.db;
      const { GridFSBucket } = require('mongodb');
      const gridFSBucket = new GridFSBucket(db, { bucketName: 'pdfs' });

      // Guardar cada PDF y obtener sus IDs
      const pdfFileIds: any = {};

      // Portada y extras
      const coverUpload = gridFSBucket.openUploadStream(`catalog-cover-${job._id}.pdf`, { contentType: 'application/pdf' });
      coverUpload.end(pdfs.coverAndExtras);
      pdfFileIds.coverAndExtras = await new Promise((resolve, reject) => {
        coverUpload.on('finish', () => resolve(coverUpload.id));
        coverUpload.on('error', reject);
      });

      // Categorías
      pdfFileIds.categories = [];
      for (const cat of pdfs.categories) {
        const catUpload = gridFSBucket.openUploadStream(`catalog-category-${cat.categoryId}-${job._id}.pdf`, { contentType: 'application/pdf' });
        catUpload.end(cat.buffer);
        const catFileId = await new Promise((resolve, reject) => {
          catUpload.on('finish', () => resolve(catUpload.id));
          catUpload.on('error', reject);
        });
        pdfFileIds.categories.push({ categoryId: cat.categoryId, fileId: catFileId });
      }

      // Contraportada
      if (pdfs.backPage) {
        const backUpload = gridFSBucket.openUploadStream(`catalog-back-${job._id}.pdf`, { contentType: 'application/pdf' });
        backUpload.end(pdfs.backPage);
        pdfFileIds.backPage = await new Promise((resolve, reject) => {
          backUpload.on('finish', () => resolve(backUpload.id));
          backUpload.on('error', reject);
        });
      }

      // Elimina imágenes temporales usadas en el catálogo
      const imagesToDelete: string[] = [];
      if (job.catalogData.frontPageId) imagesToDelete.push(job.catalogData.frontPageId);
      if (job.catalogData.backPageId) imagesToDelete.push(job.catalogData.backPageId);
      if (Array.isArray(job.catalogData.extraImagesIds)) imagesToDelete.push(...job.catalogData.extraImagesIds);
      if (Array.isArray(job.catalogData.categoriesPayloadWithIds)) {
        for (const cat of job.catalogData.categoriesPayloadWithIds) {
          if (cat.frontPageId) imagesToDelete.push(cat.frontPageId);
          if (cat.backgroundImageId) imagesToDelete.push(cat.backgroundImageId);
        }
      }
      for (const imgId of imagesToDelete) {
        try {
          await this.imagesService.deleteImage(imgId);
        } catch (e) {
          this.logger.warn(`No se pudo eliminar la imagen temporal ${imgId}: ${e.message}`);
        }
      }

      job.status = 'done';
      job.updatedAt = new Date();
      job.pdfFileIds = pdfFileIds; // Cambia de pdfFileId a pdfFileIds
      await job.save();
      this.logger.log(`Job ${job._id} completado`);
    } catch (e) {
      job.status = 'error';
      job.updatedAt = new Date();
      job.error = e.message;
      await job.save();
      this.logger.error(`Error en job ${job._id}: ${e.message}`);
    }
  }
}