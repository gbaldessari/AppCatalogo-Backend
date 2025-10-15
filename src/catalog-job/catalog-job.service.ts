import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { CatalogJob, } from './schema/catalog-job.schema';
import { GenerateCatalogWithIdsDto } from 'src/generate-catalog/dto/generateCatalog.dto';
import { GridFSBucket, ObjectId } from 'mongodb';
import { ImagesService } from 'src/images/images.service';
import { PDFDocument } from 'pdf-lib';
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class CatalogJobService {
  private gridFSBucket: GridFSBucket;
  private readonly logger = new Logger(CatalogJobService.name);
  constructor(
    @InjectModel(CatalogJob.name) private catalogJobModel: Model<CatalogJob>,
    @Inject(ImagesService) private readonly imagesService: ImagesService,
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
    @InjectConnection() private readonly connection: Connection,
  ) {
    this.gridFSBucket = new GridFSBucket(this.connection.db!, {
      bucketName: 'pdfs',
    });
  }

  private generateDefaultFileName(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `catalogo-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  }

  async createJob(catalogData: GenerateCatalogWithIdsDto) {
    const provided = String(catalogData?.fileName ?? '').trim();
    const fileName = provided || this.generateDefaultFileName();
    this.logger.log(`Creating catalog job with fileName: ${fileName}`);
    const job = await this.catalogJobModel.create({ catalogData, fileName });
    for (const category of catalogData.categoriesPayloadWithIds) {
      const design = {
        color: category.color,
        frontPageId: category.frontPageId,
        backgroundImageId: category.backgroundImageId,
      }
      await this.categoriesService.updateCategoryDesign(category._id, design);
    }
    job.createdAt = new Date();
    await job.save();
    return { jobId: job._id };
  }

  async getJobStatus(jobId: string) {
    const job = await this.catalogJobModel.findById(jobId);
    if (!job) throw new NotFoundException();
    return { fileName: job.fileName, status: job.status, error: job.error };
  }

  async downloadCatalog(jobId: string, res, type?: string, categoryId?: string) {
    const job = await this.catalogJobModel.findById(jobId);
    if (!job || job.status !== 'done' || !job.pdfFileIds) throw new NotFoundException();

    let fileId;
    const ensurePdf = (name: string) => (name?.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);
    let fileName = ensurePdf(job.fileName);

    if (!type || type === 'all') {
      // Concatenar todos los PDFs en orden: portada+extras, categorías, contraportada
      const ids: string[] = [];
      if (job.pdfFileIds.coverAndExtras) ids.push(job.pdfFileIds.coverAndExtras);
      if (Array.isArray(job.pdfFileIds.categories)) {
        for (const cat of job.pdfFileIds.categories) {
          if (cat.fileId) ids.push(cat.fileId);
        }
      }
      if (job.pdfFileIds.backPage) ids.push(job.pdfFileIds.backPage);

      // Descargar todos los buffers
      const buffers: Buffer[] = [];
      for (const id of ids) {
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          const stream = this.gridFSBucket.openDownloadStream(new ObjectId(id));
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => {
            buffers.push(Buffer.concat(chunks));
            resolve();
          });
          stream.on('error', reject);
        });
      }

      // Concatenar usando pdf-lib
      const mergedPdf = await PDFDocument.create();
      for (const pdfBytes of buffers) {
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        for (const page of copiedPages) {
          mergedPdf.addPage(page);
        }
      }
      const mergedBytes = await mergedPdf.save();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.end(Buffer.from(mergedBytes));
      return;
    } else if (type === 'cover') {
      fileId = job.pdfFileIds.coverAndExtras;
    } else if (type === 'back') {
      fileId = job.pdfFileIds.backPage;
    } else if (type === 'category' && categoryId) {
      const cat = (job.pdfFileIds.categories || []).find(c => String(c.categoryId) === String(categoryId));
      if (!cat) throw new NotFoundException();
      fileId = cat.fileId;
    } else {
      throw new NotFoundException();
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${ensurePdf(fileName)}"`);
    const stream = this.gridFSBucket.openDownloadStream(new ObjectId(fileId));
    stream.on('error', () => res.status(404).end());
    stream.pipe(res);
  }

  async getAllJobs() {
    return this.catalogJobModel.find().sort({ createdAt: -1 });
  }

  async deleteJob(jobId: string) {
    const job = await this.catalogJobModel.findById(jobId);
    if (!job) throw new NotFoundException();
    if (job.status === 'processing') {
      throw new ConflictException('Cannot delete a job that is currently being processed');
    }
    // Cambia pdfFileId por pdfFileIds
    if (job.status === 'done' && job.pdfFileIds) {
      // Elimina todos los PDFs asociados
      const ids: string[] = [];
      if (job.pdfFileIds.coverAndExtras) ids.push(job.pdfFileIds.coverAndExtras);
      if (Array.isArray(job.pdfFileIds.categories)) {
        for (const cat of job.pdfFileIds.categories) {
          if (cat.fileId) ids.push(cat.fileId);
        }
      }
      if (job.pdfFileIds.backPage) ids.push(job.pdfFileIds.backPage);
      for (const id of ids) {
        try {
          await this.gridFSBucket.delete(new ObjectId(id));
        } catch (e) {
          this.logger.warn(`No se pudo eliminar el PDF temporal ${id}: ${e.message}`);
        }
      }
    }
    else if (job.status === 'pending' || job.status === 'error') {
      const imagesToDelete: string[] = [];
      if (job.catalogData.frontPageId) imagesToDelete.push(job.catalogData.frontPageId);
      if (job.catalogData.backPageId) imagesToDelete.push(job.catalogData.backPageId);
      if (Array.isArray(job.catalogData.extraImagesIds)) imagesToDelete.push(...job.catalogData.extraImagesIds);
      for (const imgId of imagesToDelete) {
        try {
          await this.imagesService.deleteImage(imgId);
        } catch (e) {
          this.logger.warn(`No se pudo eliminar la imagen temporal ${imgId}: ${e.message}`);
        }
      }
    }
    await this.catalogJobModel.deleteOne({ _id: jobId });
    return { message: 'Job deleted successfully' };
  }
}