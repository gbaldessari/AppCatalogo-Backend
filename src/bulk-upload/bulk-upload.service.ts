import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CategoriesService } from '../categories/categories.service';
import { ImagesService, MulterFile } from '../images/images.service';
import { ProductsService } from 'src/products/products.service';
import * as sharp from 'sharp';
import { BulkUploadResponseDto } from './dto/bulkUpload.dto';
import { Product } from 'src/products/schema/product.schema';

@Injectable()
export class BulkUploadService {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly imagesService: ImagesService,
    private readonly productsService: ProductsService,
  ) { }

  private readonly logger = new Logger(BulkUploadService.name);

  // --- NUEVOS MÉTODOS HELPER ---

  /**
   * Normaliza cadenas generales (acentos, mayúsculas, espacios).
   */
  private normalize(str: string): string {
    return (str || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Valida que el SKU contenga solo caracteres permitidos (alfanumérico + - _ . y espacios).
   * Se permite mezcla de letras y números.
   */
  private isValidSku(raw: string): boolean {
    if (!raw) return false;
    return /^[A-Za-z0-9\-_. ]+$/.test(raw);
  }

  /**
   * Normaliza un SKU para comparación flexible:
   * - Elimina espacios.
   * - Convierte a mayúsculas.
   * - Si todo es numérico, quita ceros a la izquierda.
   * - Si tiene prefijo alfanumérico y termina en dígitos, normaliza sólo la parte numérica final.
   *   Ej: 0000123 -> 123
   */
  private normalizeSku(sku: string): string {
    if (!sku) return '';
    let cleaned = sku.toString().trim().replace(/\s+/g, '').toUpperCase();

    // Caso solo dígitos -> quitar ceros a la izquierda
    if (/^\d+$/.test(cleaned)) {
      return cleaned.replace(/^0+/, '') || '0';
    }

    // Caso prefijo + parte numérica final: quitar ceros solo de la parte numérica final
    const match = cleaned.match(/^(.*?)(\d+)$/);
    if (match) {
      const prefix = match[1];
      const digits = match[2].replace(/^0+/, '') || '0';
      return prefix + digits;
    }

    // Si no hay parte numérica final clara, devolver limpio
    return cleaned;
  }

  async bulkCreateProducts(rows: any[]): Promise<BulkUploadResponseDto[]> {
    const failedRows: BulkUploadResponseDto[] = [];
    for (const row of rows) {
      try {
        // Buscar categoría por nombre
        const category = await this.categoriesService.findByName(row['Categoría']);
        if (!category) {
          failedRows.push({ row, reason: 'Categoría no encontrada' });
          continue;
        }

        // Descargar imagen y subirla a tu sistema
        let imageId: string | undefined = undefined;
        if (row['Link imagen']) {
          try {
            const response = await axios.get(row['Link imagen'], { responseType: 'arraybuffer' });
            const arrayBuffer = response.data as ArrayBufferLike;
            let buffer: Buffer = Buffer.from(arrayBuffer);

            // Comprimir la imagen usando sharp
            buffer = await sharp(buffer)
              .resize({ width: 500, height: 500, fit: 'inside' })
              .jpeg({ quality: 30 })
              .toBuffer();

            const image: MulterFile = {
              fieldname: 'file',
              originalname: row['Link imagen'].split('/').pop() || 'image.jpg',
              encoding: '7bit',
              mimetype: response.headers['content-type'] || 'image/jpeg',
              size: buffer.length,
              buffer: buffer,
            };
            // Usa tu ImagesService para guardar la imagen y obtener el imageId
            const uploadResult = await this.imagesService.uploadImage(image);
            imageId = uploadResult.imageId;
          } catch (imgErr) {
            failedRows.push({ row, reason: 'Error al procesar imagen', error: imgErr?.message || imgErr });
            continue;
          }
        }

        // Si imageId es requerido y no se obtuvo, puedes asignar un valor por defecto aquí:
        if (!imageId) {
          failedRows.push({ row, reason: 'No se pudo obtener imageId (imagen requerida por el modelo)' });
          continue;
        }

        await this.productsService.createProduct({
          sku: row['Cod.'],
          name: row['Producto'],
          catalogueName: row['Catalogo'],
          categoryId: category._id as string,
          units: Number(row['Unidades']),
          imageId,
          price: Number(row['Precio']),
        });
      } catch (err) {
        failedRows.push({ row, reason: 'Error al crear producto', error: err?.message || err });
      }
    }
    return failedRows;
  }

  // Desactiva productos que ESTÁN en el archivo (no los que faltan)
  async bulkDeactivateProducts(rows: any[]): Promise<BulkUploadResponseDto[]> {
    const failedRows: BulkUploadResponseDto[] = [];

    const targetSet = new Set<string>();
    const rawNormalizedPairs: { original: string; normalized: string }[] = [];

    // Parseo de filas y normalización
    for (const row of rows) {
      const rawSku = row['Cod.'];
      const rawStr = (rawSku === undefined || rawSku === null) ? '' : String(rawSku).trim();
      if (rawStr === '') {
        failedRows.push({ row, reason: 'Fila sin SKU en columna "Cod."' });
        continue;
      }
      if (!this.isValidSku(rawStr)) {
        failedRows.push({ row, reason: 'SKU con caracteres no permitidos (ignorado)' });
        continue;
      }
      const normalized = this.normalizeSku(rawStr);
      if (normalized === '') {
        failedRows.push({ row, reason: 'SKU inválido tras normalización' });
        continue;
      }
      targetSet.add(normalized);
      rawNormalizedPairs.push({ original: rawStr, normalized });
    }

    if (targetSet.size === 0) {
      failedRows.push({ row: {}, reason: 'No se encontraron SKUs válidos en la columna "Cod." (no se desactivó ningún producto)' });
      return failedRows;
    }

    try {
      const allProducts = await this.productsService.getProducts();
      const activeProducts = allProducts.filter(p => p.isActive);

      // Mapa normalizado → productos
      const normalizedToProduct = new Map<string, Product[]>();
      for (const p of allProducts) {
        const n = this.normalizeSku(p.sku);
        if (!normalizedToProduct.has(n)) normalizedToProduct.set(n, []);
        normalizedToProduct.get(n)!.push(p);
      }

      // Determinar los productos a desactivar: los activos cuyo SKU normalizado está en el archivo
      const toDeactivate = activeProducts.filter(p => targetSet.has(this.normalizeSku(p.sku)));

      console.log('[BulkDeactivate]',
        'Modo: list-only',
        'Total productos:', allProducts.length,
        'Activos:', activeProducts.length,
        'SKUs archivo (normalizados):', targetSet.size,
        'A desactivar:', toDeactivate.length
      );

      for (const product of toDeactivate) {
        try {
          await this.productsService.deactivateProduct(product.sku);
        } catch (err) {
          failedRows.push({
            row: { 'Cod.': product.sku },
            reason: 'Error al desactivar producto',
            error: err?.message || err
          });
        }
      }

      // Reportar SKUs del archivo que no existen en la base (una sola vez)
      const notFoundSet = new Set<string>();
      for (const { normalized, original } of rawNormalizedPairs) {
        if (!normalizedToProduct.has(normalized) && !notFoundSet.has(normalized)) {
          notFoundSet.add(normalized);
            failedRows.push({
              row: { 'Cod.': original },
              reason: 'SKU del archivo no existe en base de datos (comparación normalizada)'
            });
        }
      }

      if (toDeactivate.length === 0) {
        failedRows.push({ row: {}, reason: 'Ningún SKU del archivo correspondía a productos activos (nada desactivado)' });
      }

    } catch (globalErr) {
      failedRows.push({ row: {}, reason: 'Error general obteniendo productos', error: globalErr?.message || globalErr });
    }

    return failedRows;
  }

  // Activa productos cuyos SKUs (normalizados) están en el archivo
  async bulkActivateProducts(rows: any[]): Promise<BulkUploadResponseDto[]> {
    const failedRows: BulkUploadResponseDto[] = [];
    const activateSet = new Set<string>();
    const validOriginal: { original: string; normalized: string }[] = [];

    for (const row of rows) {
      const rawSku = row['Cod.'];
      const rawStr = (rawSku === undefined || rawSku === null) ? '' : String(rawSku).trim();
      if (rawStr === '') {
        failedRows.push({ row, reason: 'Fila sin SKU en columna "Cod."' });
        continue;
      }
      if (!this.isValidSku(rawStr)) {
        failedRows.push({ row, reason: 'SKU con caracteres no permitidos (ignorado)' });
        continue;
      }
      const normalized = this.normalizeSku(rawStr);
      if (normalized === '') {
        failedRows.push({ row, reason: 'SKU inválido tras normalización' });
        continue;
      }
      activateSet.add(normalized);
      validOriginal.push({ original: rawStr, normalized });
    }

    if (activateSet.size === 0) {
      failedRows.push({ row: {}, reason: 'No se encontraron SKUs válidos (no se activó ningún producto)' });
      return failedRows;
    }

    try {
      const allProducts = await this.productsService.getProducts();
      const normalizedToProduct = new Map<string, Product[]>();
      for (const p of allProducts) {
        const n = this.normalizeSku(p.sku);
        if (!normalizedToProduct.has(n)) normalizedToProduct.set(n, []);
        normalizedToProduct.get(n)!.push(p);
      }

      const toActivate = allProducts.filter(p => !p.isActive && activateSet.has(this.normalizeSku(p.sku)));

      console.log('[BulkActivate] Total productos:', allProducts.length,
                  'A activar (match):', toActivate.length,
                  'SKUs archivo (normalizados):', activateSet.size);

      for (const product of toActivate) {
        try {
          await this.productsService.activateProduct(product.sku);
        } catch (err) {
          failedRows.push({
            row: { 'Cod.': product.sku },
            reason: 'Error al activar producto',
            error: err?.message || err
          });
        }
      }

      // Reportar SKUs del archivo que no existen
      const notFoundSet = new Set<string>();
      for (const { original, normalized } of validOriginal) {
        if (!normalizedToProduct.has(normalized) && !notFoundSet.has(normalized)) {
          notFoundSet.add(normalized);
          failedRows.push({
            row: { 'Cod.': original },
            reason: 'Producto no encontrado para activar (comparación normalizada)'
          });
        }
      }

    } catch (globalErr) {
      failedRows.push({ row: {}, reason: 'Error general activando productos', error: globalErr?.message || globalErr });
    }

    return failedRows;
  }

}