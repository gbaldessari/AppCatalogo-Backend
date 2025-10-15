import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { GridFSBucket } from 'mongodb';
import { Connection } from 'mongoose';
import { CategoriesService } from 'src/categories/categories.service';
import { ImagesService } from 'src/images/images.service';
import { OffersService } from 'src/offers/offers.service';
import { ProductsService } from 'src/products/products.service';
import * as puppeteer from 'puppeteer';
import * as sharp from 'sharp';
import { GenerateCatalogWithIdsDto } from './dto/generateCatalog.dto';
import { PDFDocument } from 'pdf-lib';

/**
 * Servicio para la generación de catálogos en formato PDF.
 *
 * @remarks
 * Integra productos, ofertas, categorías e imágenes para construir un catálogo personalizado y exportarlo como PDF.
 */
@Injectable()
export class GenerateCatalogService {
  private gridFSBucket: GridFSBucket;
  private readonly logger = new Logger(GenerateCatalogService.name);
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @Inject(ProductsService) private readonly productsService: ProductsService,
    @Inject(OffersService) private readonly offersService: OffersService,
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
    @Inject(ImagesService) private readonly imagesService: ImagesService,
  ) {
    this.gridFSBucket = new GridFSBucket(this.connection.db!, {
      bucketName: 'images',
    });
  }

  /**
   * Obtiene una imagen desde GridFS y la retorna como base64 optimizada.
   */
  private async getImageBase64ById(imageId: string | null): Promise<string | null> {
    if (!imageId) return null;
    try {
      const imageDoc = await this.imagesService['imageModel'].findById(imageId).exec();
      if (!imageDoc) return null;
      const chunks: Buffer[] = [];
      const downloadStream = this.gridFSBucket.openDownloadStream(
        new (require('mongoose').Types.ObjectId)(imageDoc.fileId)
      );
      await new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', resolve);
        downloadStream.on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 1240, height: 1754, fit: "fill" })
        .jpeg({ quality: 80 })
        .toBuffer();
      return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene una imagen desde GridFS y la retorna como base64 optimizada para productos.
   */
  private async getProductImageBase64ById(imageId: string | null): Promise<string | null> {
    if (!imageId) return null;
    try {
      const imageDoc = await this.imagesService['imageModel'].findById(imageId).exec();
      if (!imageDoc) return null;
      const chunks: Buffer[] = [];
      const downloadStream = this.gridFSBucket.openDownloadStream(
        new (require('mongoose').Types.ObjectId)(imageDoc.fileId)
      );
      await new Promise((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', resolve);
        downloadStream.on('error', reject);
      });
      const buffer = Buffer.concat(chunks);
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 400 })
        .jpeg({ quality: 50 })
        .toBuffer();
      return `data:image/jpeg;base64,${optimizedBuffer.toString('base64')}`;
    } catch {
      return null;
    }
  }

  /**
   * Rasteriza HTML a imágenes JPEG, guarda cada imagen en GridFS temporalmente y devuelve los IDs.
   * Usa una sola instancia de Puppeteer y reutiliza la página.
   */
  private async rasterizeHtmlToGridFSImages(
    html: string,
    gridFSBucket: GridFSBucket,
    page: puppeteer.Page,
    label: string
  ): Promise<string[]> {
    // Setea el contenido y cuenta las páginas
    await page.setViewport({ width: 1240, height: 1754 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 180000 }); // 3 minutos de timeout
    const pageCount = await page.evaluate(() => Array.from(document.body.children).length);

    const imageIds: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      await page.evaluate((idx) => {
        Array.from(document.body.children).forEach((el, j) => {
          (el as HTMLElement).style.display = (j === idx) ? '' : 'none';
        });
      }, i);
      const imgBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        clip: { x: 0, y: 0, width: 1240, height: 1754 }
      });
      // Guarda la imagen en GridFS temporal
      const uploadStream = gridFSBucket.openUploadStream(
        `catalog-temp-${label}-${Date.now()}-${i}.jpg`,
        { contentType: 'image/jpeg' }
      );
      uploadStream.end(imgBuffer);
      const imageId = await new Promise<string>((resolve, reject) => {
        uploadStream.on('finish', () => resolve(String(uploadStream.id)));
        uploadStream.on('error', reject);
      });
      imageIds.push(imageId);
    }
    return imageIds;
  }

  /**
   * Ensambla un PDF a partir de imágenes JPEG almacenadas en GridFS.
   * Elimina las imágenes temporales después de usarlas.
   */
  private async assemblePdfFromGridFSImages(
    imageIds: string[],
    gridFSBucket: GridFSBucket
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    for (const imageId of imageIds) {
      // Descarga la imagen desde GridFS
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        const stream = gridFSBucket.openDownloadStream(new (require('mongoose').Types.ObjectId)(imageId));
        stream.on('data', chunk => chunks.push(chunk));
        stream.on('end', resolve);
        stream.on('error', reject);
      });
      const imgBuffer = Buffer.concat(chunks);
      const jpgImage = await pdfDoc.embedJpg(imgBuffer);
      const page = pdfDoc.addPage([1240, 1754]);
      page.drawImage(jpgImage, { x: 0, y: 0, width: 1240, height: 1754 });
      // Elimina la imagen temporal de GridFS
      await gridFSBucket.delete(new (require('mongoose').Types.ObjectId)(imageId));
    }
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Genera varios PDFs: portada+extras, cada categoría, contraportada.
   * Rasteriza cada página, guarda imágenes en GridFS temporalmente y ensambla el PDF.
   */
  async generateCatalogMultiPdf(catalogData: GenerateCatalogWithIdsDto): Promise<{
    coverAndExtras: Buffer,
    categories: { categoryId: string, buffer: Buffer }[],
    backPage: Buffer | null
  }> {
    try {
      this.logger.log('Obteniendo productos...');
      const products = (await this.productsService.getProducts()).filter(p => p.isActive);
      this.logger.log('Obteniendo ofertas...');
      const offers = await this.offersService.getOffers();
      this.logger.log('Obteniendo categorías...');
      const allCategories = await this.categoriesService.getCategories();

      const offerMap = new Map<string, any>();
      for (const offer of offers) {
        offerMap.set(String(offer.productSku), offer);
      }

      // Usar bucket temporal para imágenes rasterizadas y fondos
      const tempBucket = new GridFSBucket(this.connection.db!, { bucketName: 'pdfs-temp' });

      // --- Guardar imágenes de portada, extras y fondos en GridFS temporal ANTES de generar HTML ---
      // Portada
      let frontPageBase64: string | null = null;
      if (catalogData.frontPageId) {
        const original = await this.getImageBase64ById(catalogData.frontPageId);
        if (original) {
          const tempId = await this.saveBase64ImageToGridFS(original, tempBucket, 'front');
          frontPageBase64 = await this.getAndDeleteTempImageBase64ById(tempId, tempBucket);
        }
      }

      // Contraportada
      let backPageBase64: string | null = null;
      if (catalogData.backPageId) {
        const original = await this.getImageBase64ById(catalogData.backPageId);
        if (original) {
          const tempId = await this.saveBase64ImageToGridFS(original, tempBucket, 'back');
          backPageBase64 = await this.getAndDeleteTempImageBase64ById(tempId, tempBucket);
        }
      }

      // Extras
      const extraImagesBase64: string[] = [];
      if (catalogData.extraImagesIds && Array.isArray(catalogData.extraImagesIds)) {
        for (const imgId of catalogData.extraImagesIds) {
          const original = await this.getImageBase64ById(imgId);
          if (original) {
            const tempId = await this.saveBase64ImageToGridFS(original, tempBucket, 'extra');
            const b64 = await this.getAndDeleteTempImageBase64ById(tempId, tempBucket);
            extraImagesBase64.push(b64);
          }
        }
      }

      // Mapa de colores, portada y fondo por categoría
      const categoryDataMap = new Map<string, { color: string, frontPage?: string | null, backgroundImage?: string | null }>();
      const allowedCategoryIds = new Set<string>();
      if (catalogData.categoriesPayloadWithIds) {
        for (const cat of catalogData.categoriesPayloadWithIds) {
          const color = cat.color;
          // Portada de categoría
          let frontPage: string | null = null;
          if (cat.frontPageId) {
            const original = await this.getImageBase64ById(cat.frontPageId);
            if (original) {
              const tempId = await this.saveBase64ImageToGridFS(original, tempBucket, `cat-front-${cat._id}`);
              frontPage = await this.getAndDeleteTempImageBase64ById(tempId, tempBucket);
            }
          }
          // Fondo de categoría
          let backgroundImage: string | null = null;
          if (cat.backgroundImageId) {
            const original = await this.getImageBase64ById(cat.backgroundImageId);
            if (original) {
              const tempId = await this.saveBase64ImageToGridFS(original, tempBucket, `cat-bg-${cat._id}`);
              backgroundImage = await this.getAndDeleteTempImageBase64ById(tempId, tempBucket);
            }
          }
          categoryDataMap.set(String(cat._id), { color, frontPage, backgroundImage });
          allowedCategoryIds.add(String(cat._id));
        }
      }

      // Construir el orden de categorías a procesar según la entrada del usuario
      const allCategoriesMap = new Map(allCategories.map((c) => [String(c._id), c]));
      const categoriesInOrder = (catalogData.categoriesPayloadWithIds || [])
        .map((c) => allCategoriesMap.get(String(c._id)))
        .filter(Boolean) as any[];
      const useOrder = categoriesInOrder.length > 0;
      const categoriesToProcess = useOrder ? categoriesInOrder : allCategories;

      // Liberar memoria de catalogData después de guardar imágenes
      catalogData.frontPageId = null;
      catalogData.backPageId = null;
      catalogData.extraImagesIds = [];
      if (catalogData.categoriesPayloadWithIds) {
        for (const cat of catalogData.categoriesPayloadWithIds) {
          cat.frontPageId = undefined;
          cat.backgroundImageId = undefined;
        }
      }

      this.logger.log('Inicializando Puppeteer...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();

      // --- 1. Portada + extras ---
      let coverHtml: string | null = null;
      coverHtml = `
        <html>
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
          <style>
            html, body { height: 100%; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Montserrat', Arial, sans-serif; margin: 0; padding: 0; min-height: 100vh; min-width: 100vw; }
            .page-bg {
              position: fixed;
              z-index: -1;
              inset: 0;
              width: 100%;
              height: 100%;
              background-size: cover !important;
              background-position: center center !important;
              background-repeat: no-repeat !important;
            }
            .cover, .custom-page, .category-cover {
              display: flex; justify-content: center; align-items: center;
              height: 100vh; width: 100vw;
              font-family: 'Montserrat', Arial, sans-serif;
              font-weight: 900;
              background-size: cover !important;
              background-position: center center !important;
              background-repeat: no-repeat !important;
              margin: 0; padding: 0;
            }
            .cover { font-size: 60px; color: #3456c7; letter-spacing: 2px; }
            .category-cover { page-break-before: always; }
            .custom-page { page-break-before: always; }
            .products-page { 
              page-break-after: always; 
              display: flex; flex-direction: column; row-gap: 18px;
              margin: 0 0 40px 0; padding: 40px 40px 0 40px;
              height: calc(100vh - 120px); box-sizing: border-box;
              position: relative;
              z-index: 1;
              background: transparent !important;
            }
            .products-row { display: flex; flex-direction: row; gap: 24px; height: 25%; }
            .products-row.center { justify-content: center; }
            .product-offer-badge-img {
              position: absolute; 
              top: -30px; 
              left: -30px; 
              width: 110px; 
              height: 110px; 
              z-index: 10; 
              pointer-events: none; 
              user-select: none;
            }
            .product-offer-badge-container, .product-container {
              position: relative; height: 100%; max-width: 48%; display: flex; align-items: stretch; flex: 1 1 0;
              background: transparent !important;
            }
            .product {
              border-radius: 20px;
              background-color: var(--product-bg);
              color: #fff !important;
              display: flex;
              align-items: center;
              padding: 4vh 3vw;
              box-shadow: 0 5px 5px 0 rgba(0,0,0,0.25);
              box-sizing: border-box;
              position: relative;
              flex: 1 1 0;
              font-family: 'Montserrat', Arial, sans-serif;
              font-weight: 700;
            }
            .product-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; color: #fff !important; }
            .product-img { 
              width: clamp(160px, 24vh, 260px); 
              height: clamp(160px, 24vh, 260px); 
              object-fit: contain; border-radius: 16px; margin: 0 3vw 0 0; background: #fff; border: 2px solid #ccc; flex-shrink: 0; 
            }
            .product-name { 
              font-size: clamp(15px, 2.4vh, 25px); 
              font-weight: 900; 
              margin-bottom: 1.2vh; 
              word-break: break-word; 
              color: #fff !important; 
              letter-spacing: 0.5px;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
            .product-units {
              font-size: clamp(13px, 2.2vh, 20px);
              margin-bottom: 0.8vh;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
            .product-price, .product-price-normal, .product-price-offer, .product-exp {
              font-family: 'Montserrat', Arial, sans-serif;
              font-weight: 700;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
            .product-price {
              font-size: clamp(18px, 2.6vh, 28px);
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
            .product-price-offer { 
              font-size: clamp(22px, 3.2vh, 34px); 
              color: #ffe066 !important; 
              font-weight: 900; 
              letter-spacing: 0.5px;
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
            }
            .product-price-normal { 
              font-size: clamp(14px, 2.2vh, 22px); 
              color: #b3c6e6 !important; 
              text-decoration: line-through; margin-right: 16px; 
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
            }
            .product-exp { 
              font-size: clamp(11px, 1.3vh, 14px); 
              color: #b3c6e6 !important; 
              margin-left: 24px; 
              text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
            }
          </style>
        </head>
        <body>
      `;
      if (frontPageBase64) {
        coverHtml += `<div class="cover" style="background-image:url('${frontPageBase64}');"></div>`;
      } else {
        coverHtml += `<div class="cover">Catálogo</div>`;
      }
      if (extraImagesBase64.length > 0) {
        for (const img of extraImagesBase64) {
          coverHtml += `<div class="custom-page" style="background-image:url('${img}');"></div>`;
        }
      }
      coverHtml += `</body></html>`;

      this.logger.log('Rasterizando portada y extras...');
      const coverImageIds = await this.rasterizeHtmlToGridFSImages(coverHtml, tempBucket, page, 'cover');
      coverHtml = null; // Liberar memoria
      // Ensambla el PDF final de portada+extras
      const coverAndExtras = await this.assemblePdfFromGridFSImages(coverImageIds, tempBucket);

      const selloPath = require('path').resolve('src/assets/images/sello.png');
      const selloBuffer = require('fs').readFileSync(selloPath);
      const selloBase64 = `data:image/png;base64,${selloBuffer.toString('base64')}`;

      let catHtml: string | null = null;
      // --- 2. Categorías ---
      const categories: { categoryId: string, buffer: Buffer }[] = [];
      for (const category of categoriesToProcess) {
        // Ordena productos: primero los que tienen oferta, luego los normales
        let productsInCategory = products.filter(p => String(p.categoryId) === String(category._id));
        productsInCategory = productsInCategory.sort((a, b) => {
          const aHasOffer = offerMap.has(String(a.sku)) ? 1 : 0;
          const bHasOffer = offerMap.has(String(b.sku)) ? 1 : 0;
          return bHasOffer - aHasOffer;
        });

        if (productsInCategory.length === 0) continue;

        // Datos personalizados de la categoría
        const catData = categoryDataMap.get(String(category._id));
        const cardColor = catData?.color || "#00000000";
        const categoryFrontPage = catData?.frontPage;
        const categoryBackground = catData?.backgroundImage;

        // Solo muestra la imagen de portada de la categoría (sin tarjeta ni título)
        catHtml = `
          <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
            <style>
              html, body { height: 100%; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Montserrat', Arial, sans-serif; margin: 0; padding: 0; min-height: 100vh; min-width: 100vw; }
              .page-bg {
                position: fixed;
                z-index: -1;
                inset: 0;
                width: 100%;
                height: 100%;
                background-size: cover !important;
                background-position: center center !important;
                background-repeat: no-repeat !important;
              }
              .cover, .custom-page, .category-cover {
                display: flex; justify-content: center; align-items: center;
                height: 100vh; width: 100vw;
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 900;
                background-size: cover !important;
                background-position: center center !important;
                background-repeat: no-repeat !important;
                margin: 0; padding: 0;
              }
              .cover { font-size: 60px; color: #3456c7; letter-spacing: 2px; }
              .category-cover { page-break-before: always; }
              .custom-page { page-break-before: always; }
              .products-page { 
                page-break-after: always; 
                display: flex; flex-direction: column; row-gap: 18px;
                margin: 0 0 40px 0; padding: 40px 40px 0 40px;
                height: calc(100vh - 120px); box-sizing: border-box;
                position: relative;
                z-index: 1;
                background: transparent !important;
              }
              .products-row { display: flex; flex-direction: row; gap: 24px; height: 25%; }
              .products-row.center { justify-content: center; }
              .product-offer-badge-img {
                position: absolute; 
                top: -30px; 
                left: -30px; 
                width: 110px; 
                height: 110px; 
                z-index: 10; 
                pointer-events: none; 
                user-select: none;
              }
              .product-offer-badge-container, .product-container {
                position: relative; height: 100%; max-width: 48%; display: flex; align-items: stretch; flex: 1 1 0;
                background: transparent !important;
              }
              .product {
                border-radius: 20px;
                background-color: var(--product-bg);
                color: #fff !important;
                display: flex;
                align-items: center;
                padding: 4vh 3vw;
                box-shadow: 0 5px 5px 0 rgba(0,0,0,0.25);
                box-sizing: border-box;
                position: relative;
                flex: 1 1 0;
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 700;
              }
              .product-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; color: #fff !important; }
              .product-img { 
                width: clamp(140px, 24vh, 240px); 
                height: clamp(140px, 24vh, 240px); 
                object-fit: contain; border-radius: 16px; margin: 0 3vw 0 0; background: #fff; border: 2px solid #ccc; flex-shrink: 0; 
              }
              .product-name { 
                font-size: clamp(16px, 2.4vh, 26px); 
                font-weight: 900; 
                margin-bottom: 1.2vh; 
                word-break: break-word; 
                color: #fff !important; 
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-units {
                font-size: clamp(14px, 2.2vh, 22px);
                margin-bottom: 0.8vh;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price, .product-price-normal, .product-price-offer, .product-exp {
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 700;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price {
                font-size: clamp(20px, 2.6vh, 30px);
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price-offer { 
                font-size: clamp(24px, 3.2vh, 36px); 
                color: #ffe066 !important; 
                font-weight: 900; 
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price-normal { 
                font-size: clamp(14px, 2.2vh, 22px); 
                color: #b3c6e6 !important; 
                text-decoration: line-through; margin-right: 16px; 
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
              }
              .product-exp { 
                font-size: clamp(11px, 1.3vh, 14px); 
                color: #b3c6e6 !important; 
                margin-left: 24px; 
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
              }
            </style>
          </head>
          <body>
        `;
        if (categoryFrontPage) {
          catHtml += `<div class="category-cover" style="background-image:url('${categoryFrontPage}');"></div>`;
        } else {
          catHtml += `<div class="category-cover"></div>`;
        }

        let allPages: any[][] = [];
        const total = productsInCategory.length;
        const maxPerPage = 8;
        const pageCount = Math.ceil(total / maxPerPage);
        if (pageCount > 1) {
          const base = Math.floor(total / pageCount);
          let remainder = total % pageCount;
          let idx = 0;
          for (let i = 0; i < pageCount; i++) {
            let count = base + (remainder > 0 ? 1 : 0);
            allPages.push(productsInCategory.slice(idx, idx + count));
            idx += count;
            if (remainder > 0) remainder--;
          }
        } else {
          allPages.push(productsInCategory);
        }

        for (let pageIdx = 0; pageIdx < allPages.length; pageIdx++) {
          this.logger.log(`Procesando página ${pageIdx + 1}/${allPages.length} para categoría ${category.name}`);
          const pageProducts = allPages[pageIdx];
          catHtml += `<div class="products-page" style="position:relative;">`;
          if (categoryBackground) {
            catHtml += `<div class="page-bg" style="background-image:url('${categoryBackground}');"></div>`;
          }
          for (let j = 0; j < pageProducts.length; j += 2) {
            const isLastRow = (j + 2 >= pageProducts.length) && (pageProducts.length % 2 === 1) && (j === pageProducts.length - 1);
            catHtml += `<div class="products-row${isLastRow ? ' center' : ''}">`;
            for (let k = 0; k < 2; k++) {
              const idx = j + k;
              if (idx >= pageProducts.length) break;
              const product = pageProducts[idx];
              const offer = offerMap.get(String(product.sku));
              const imageIdToUse = offer?.imageId || product.imageId;
              const imageBase64 = await this.getProductImageBase64ById(imageIdToUse);
              const cardStyle = `style="--product-bg: ${cardColor};"`;

              // Mostrar oferta solo si showOffers es true y existe oferta
              if (catalogData.visibleOffers && offer) {
                catHtml += `
                  <div class="product-offer-badge-container">
                    <img class="product-offer-badge-img" src="${selloBase64}" alt="Oferta" />
                    <div class="product" ${cardStyle}>
                      ${imageBase64 ? `<img class="product-img" src="${imageBase64}" />` : ''}
                      <div class="product-info">
                        <div class="product-name">${product.catalogueName}</div>
                        <div class="product-units">${product.units} unidades</div>
                        <div>
                          ${catalogData.visiblePrices
                    ? `<span class="product-price-normal">$${Math.round(product.price)}</span>
                             <span class="product-price-offer">$${Math.round(offer.newPrice)}</span>`
                    : ''
                  }
                          ${catalogData.visibleOffers && offer.expiration
                    ? `<span class="product-exp" style="display:inline-block;margin-left:10px;">
                              Vence: ${(() => {
                      const d = new Date(offer.expiration);
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = d.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                            </span>`
                    : ''
                  }
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              } else {
                catHtml += `
                  <div class="product-container">
                    <div class="product" ${cardStyle}>
                      ${imageBase64 ? `<img class="product-img" src="${imageBase64}" />` : ''}
                      <div class="product-info">
                        <div class="product-name">${product.catalogueName}</div>
                        <div class="product-units">${product.units} unidades</div>
                        <div>
                          ${catalogData.visiblePrices
                    ? `<span class="product-price">$${Math.round(product.price)}</span>`
                    : ''
                  }
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }
            }
            catHtml += `</div>`;
          }
          catHtml += `</div>`; // Cierra products-page
        }
        catHtml += `</body></html>`;
        this.logger.log(`Rasterizando categoría: ${category.name} (${category._id})`);
        const catImageIds = await this.rasterizeHtmlToGridFSImages(catHtml, tempBucket, page, `cat-${category._id}`);
        catHtml = null; // Liberar memoria
        const buffer = await this.assemblePdfFromGridFSImages(catImageIds, tempBucket);
        categories.push({
          categoryId: String(category._id),
          buffer
        });
      }

      // --- 3. Contraportada ---
      let backHtml: string | null = null;
      if (backPageBase64) {
        backHtml = `
          <html>
          <head>
            <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;900&display=swap" rel="stylesheet">
            <style>
              html, body { height: 100%; width: 100%; margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: 'Montserrat', Arial, sans-serif; margin: 0; padding: 0; min-height: 100vh; min-width: 100vw; }
              .page-bg {
                position: fixed;
                z-index: -1;
                inset: 0;
                width: 100%;
                height: 100%;
                background-size: cover !important;
                background-position: center center !important;
                background-repeat: no-repeat !important;
              }
              .cover, .custom-page, .category-cover {
                display: flex; justify-content: center; align-items: center;
                height: 100vh; width: 100vw;
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 900;
                background-size: cover !important;
                background-position: center center !important;
                background-repeat: no-repeat !important;
                margin: 0; padding: 0;
              }
              .cover { font-size: 60px; color: #3456c7; letter-spacing: 2px; }
              .category-cover { page-break-before: always; }
              .custom-page { page-break-before: always; }
              .products-page { 
                page-break-after: always; 
                display: flex; flex-direction: column; row-gap: 18px;
                margin: 0 0 40px 0; padding: 40px 40px 0 40px;
                height: calc(100vh - 120px); box-sizing: border-box;
                position: relative;
                z-index: 1;
                background: transparent !important;
              }
              .products-row { display: flex; flex-direction: row; gap: 24px; height: 25%; }
              .products-row.center { justify-content: center; }
              .product-offer-badge-img {
                position: absolute; 
                top: -30px; 
                left: -30px; 
                width: 110px; 
                height: 110px; 
                z-index: 10; 
                pointer-events: none; 
                user-select: none;
              }
              .product-offer-badge-container, .product-container {
                position: relative; height: 100%; max-width: 48%; display: flex; align-items: stretch; flex: 1 1 0;
                background: transparent !important;
              }
              .product {
                border-radius: 20px;
                background-color: var(--product-bg);
                color: #fff !important;
                display: flex;
                align-items: center;
                padding: 4vh 3vw;
                box-shadow: 0 5px 5px 0 rgba(0,0,0,0.25);
                box-sizing: border-box;
                position: relative;
                flex: 1 1 0;
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 700;
              }
              .product-info { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; color: #fff !important; }
              .product-img { 
                width: clamp(140px, 24vh, 240px); 
                height: clamp(140px, 24vh, 240px); 
                object-fit: contain; border-radius: 16px; margin: 0 3vw 0 0; background: #fff; border: 2px solid #ccc; flex-shrink: 0; 
              }
              .product-name { 
                font-size: clamp(16px, 2.4vh, 26px); 
                font-weight: 900; 
                margin-bottom: 1.2vh; 
                word-break: break-word; 
                color: #fff !important; 
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-units {
                font-size: clamp(14px, 2.2vh, 22px);
                margin-bottom: 0.8vh;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price, .product-price-normal, .product-price-offer, .product-exp {
                font-family: 'Montserrat', Arial, sans-serif;
                font-weight: 700;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price {
                font-size: clamp(20px, 2.6vh, 30px);
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price-offer { 
                font-size: clamp(24px, 3.2vh, 36px); 
                color: #ffe066 !important; 
                font-weight: 900; 
                letter-spacing: 0.5px;
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
              }
              .product-price-normal { 
                font-size: clamp(14px, 2.2vh, 22px); 
                color: #b3c6e6 !important; 
                text-decoration: line-through; margin-right: 16px; 
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
              }
              .product-exp { 
                font-size: clamp(11px, 1.3vh, 14px); 
                color: #b3c6e6 !important; 
                margin-left: 24px; 
                text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5); 
              }
            </style>
          </head>
          <body>
            <div class="custom-page" style="background-image:url('${backPageBase64}');"></div>
          </body>
          </html>
        `;
      }

      let backPage: Buffer | null = null;
      if (backHtml) {
        this.logger.log('Rasterizando contraportada...');
        const backImageIds = await this.rasterizeHtmlToGridFSImages(backHtml, tempBucket, page, 'back');
        backHtml = null; // Liberar memoria
        backPage = await this.assemblePdfFromGridFSImages(backImageIds, tempBucket);
      }

      await page.close();
      await browser.close();

      this.logger.log('Todos los PDFs generados correctamente.');
      return { coverAndExtras, categories, backPage };
    } catch (e) {
      this.logger.error('Error temprano en generateCatalogMultiPdf: ' + (e?.message || e));
      throw e;
    }
  }

  /**
   * Guarda una imagen base64 temporalmente en GridFS y retorna su ID.
   */
  private async saveBase64ImageToGridFS(base64: string, gridFSBucket: GridFSBucket, label: string): Promise<string> {
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) throw new Error('Formato base64 inválido');
    const buffer = Buffer.from(matches[2], 'base64');
    const uploadStream = gridFSBucket.openUploadStream(
      `catalog-temp-img-${label}-${Date.now()}.jpg`,
      { contentType: matches[1] }
    );
    uploadStream.end(buffer);
    return await new Promise<string>((resolve, reject) => {
      uploadStream.on('finish', () => resolve(String(uploadStream.id)));
      uploadStream.on('error', reject);
    });
  }

  /**
   * Descarga una imagen de GridFS por ID y la retorna como base64.
   * Elimina la imagen de GridFS después de obtenerla.
   */
  private async getAndDeleteTempImageBase64ById(imageId: string, gridFSBucket: GridFSBucket): Promise<string> {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      const stream = gridFSBucket.openDownloadStream(new (require('mongoose').Types.ObjectId)(imageId));
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    await gridFSBucket.delete(new (require('mongoose').Types.ObjectId)(imageId));
    const buffer = Buffer.concat(chunks);
    return `data:image/jpeg;base64,${buffer.toString('base64')}`;
  }
}