import { Body, Controller, Post, Res, Query, Get, Delete, UploadedFiles, UseInterceptors, UseGuards } from '@nestjs/common';
import { CatalogJobService } from './catalog-job.service';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ImagesService, MulterFile } from 'src/images/images.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { CategoriesPayloadWithIds, GenerateCatalogWithIdsDto } from 'src/generate-catalog/dto/generateCatalog.dto';
import { CategoriesService } from 'src/categories/categories.service';

@UseGuards(JwtAuthGuard)
@Controller('catalog-job')
export class CatalogJobController {
  constructor(
    private readonly catalogJobService: CatalogJobService,
    private readonly imagesService: ImagesService,
    private readonly categoriesService: CategoriesService
  ) { }

@Post('create')
  @UseInterceptors(AnyFilesInterceptor())
  async createCatalogJob(
    @UploadedFiles() files: MulterFile[],
    @Body('categoriesPayload') categoriesPayloadRaw: string,
    @Body('visiblePrices') visiblePricesRaw: string,
    @Body('visibleOffers') visibleOffersRaw: string,
    @Body('fileName') fileNameRaw: string
  ) {
    let categoriesPayload: CategoriesPayloadWithIds[] = [];
    if (categoriesPayloadRaw) {
      try {
        categoriesPayload = JSON.parse(categoriesPayloadRaw);
      } catch {
        categoriesPayload = [];
      }
    }

    files = Array.isArray(files) ? files : [];
    const fileMap: Record<string, MulterFile[]> = {};
    for (const file of files) {
      if (!fileMap[file.fieldname]) fileMap[file.fieldname] = [];
      fileMap[file.fieldname].push(file);
    }

    // Subir imágenes generales y obtener sus IDs
    const frontPageId = fileMap.frontPage?.[0] ? (await this.imagesService.uploadImage(fileMap.frontPage[0])).imageId : null;
    const backPageId = fileMap.backPage?.[0] ? (await this.imagesService.uploadImage(fileMap.backPage[0])).imageId : null;
    const extraImagesIds: string[] = [];
    if (fileMap.extraImages) {
      for (const img of fileMap.extraImages) {
        const res = await this.imagesService.uploadImage(img);
        extraImagesIds.push(res.imageId);
      }
    }

    // Subir imágenes de categorías y asociar IDs
    categoriesPayload = await Promise.all(categoriesPayload.map(async (cat: any) => {
      const frontPageFile = fileMap[`categoryFrontPage_${cat._id}`]?.[0];
      const backgroundImageFile = fileMap[`categoryBackgroundImage_${cat._id}`]?.[0];

      const categoryDesign = await this.categoriesService.getCategoryDesignById(cat._id);

      const frontPageId = frontPageFile
        ? (await this.imagesService.uploadImage(frontPageFile)).imageId
        : categoryDesign?.frontPageId ?? null;

      const backgroundImageId = backgroundImageFile
        ? (await this.imagesService.uploadImage(backgroundImageFile)).imageId
        : categoryDesign?.backgroundImageId ?? null;

      return {
        ...cat,
        frontPageId,
        backgroundImageId,
      };
    }));

    const visiblePrices = visiblePricesRaw !== undefined ? JSON.parse(visiblePricesRaw) : undefined;
    const visibleOffers = visibleOffersRaw !== undefined ? JSON.parse(visibleOffersRaw) : undefined;
    const fileName: string = fileNameRaw !== undefined ? String(fileNameRaw).trim() : "Catalogo";

    // Guarda solo los IDs en el DTO
    const generateCatalogDto: GenerateCatalogWithIdsDto = {
      fileName,
      frontPageId,
      backPageId,
      extraImagesIds,
      categoriesPayloadWithIds: categoriesPayload,
      visiblePrices,
      visibleOffers,
    };

    return await this.catalogJobService.createJob(generateCatalogDto);
  }

  @Get('status')
  async getJobStatus(@Query('jobId') jobId: string) {
    return this.catalogJobService.getJobStatus(jobId);
  }

  @Get('download')
  async downloadCatalog(
    @Query('jobId') jobId: string,
    @Query('type') type: string,
    @Query('categoryId') categoryId: string,
    @Res() res
  ) {
    return this.catalogJobService.downloadCatalog(jobId, res, type, categoryId);
  }

  @Get('all')
  async getAllJobs() {
    return this.catalogJobService.getAllJobs();
  }

  @Delete('delete')
  async deleteJob(@Query('jobId') jobId: string) {
    return this.catalogJobService.deleteJob(jobId);
  }
}