import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Punto de entrada principal de la aplicación.
 *
 * @remarks
 * Inicializa la aplicación NestJS, configura validaciones globales y habilita CORS.
 */
async function bootstrap() {
  /**
   * Crea una instancia de la aplicación NestJS utilizando el módulo raíz `AppModule`.
   */
  const app = await NestFactory.create(AppModule);

  /**
   * Aplica un pipe global de validación para transformar y validar los datos entrantes.
   */
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  /**
   * Habilita CORS para permitir solicitudes desde el frontend.
   * Configura los orígenes permitidos, métodos HTTP y credenciales.
   */
  app.enableCors({
    origin: process.env.FRONTEND_URL, // Permitir solicitudes desde el frontend especificado en las variables de entorno.
    methods: 'GET,POST,PUT,DELETE,PATCH', // Métodos HTTP permitidos.
    credentials: true, // Permitir el envío de cookies o encabezados de autenticación.
  });

  /**
   * Inicia el servidor en el puerto especificado en las variables de entorno o en el puerto 3000 por defecto.
   */
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();