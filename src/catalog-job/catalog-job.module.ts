import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogJobController } from './catalog-job.controller';
import { CatalogJobService } from './catalog-job.service';
import { CatalogJob, CatalogJobSchema } from './schema/catalog-job.schema';
import { GenerateCatalogModule } from 'src/generate-catalog/generate-catalog.module';
import { CatalogJobProcessor } from './processor/catalog-job.processor';
import { ScheduleModule } from '@nestjs/schedule';
import { ImagesModule } from 'src/images/images.module';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CatalogJob.name, schema: CatalogJobSchema }]),
    ScheduleModule.forRoot(),
    GenerateCatalogModule,
    ImagesModule,
    CategoriesModule
  ],
  controllers: [CatalogJobController],
  providers: [CatalogJobService, CatalogJobProcessor],
  exports: [CatalogJobService],
})
export class CatalogJobModule {}