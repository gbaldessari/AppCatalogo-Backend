import { Controller, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { BulkUploadService } from './bulk-upload.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as XLSX from 'xlsx';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('bulk-upload')
export class BulkUploadController {
  constructor(private readonly bulkUploadService: BulkUploadService) { }

  @Post('products')
  @UseInterceptors(FileInterceptor('file'))
  async bulkUpload(
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Leer el archivo Excel
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    return this.bulkUploadService.bulkCreateProducts(rows);
  }

  @Patch('products-deactivate')
  @UseInterceptors(FileInterceptor('file'))
  async bulkDeactivateProducts(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    return this.bulkUploadService.bulkDeactivateProducts(rows);
  }

  @Patch('products-activate')
  @UseInterceptors(FileInterceptor('file'))
  async bulkActivateProducts(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    return this.bulkUploadService.bulkActivateProducts(rows);
  }
}
