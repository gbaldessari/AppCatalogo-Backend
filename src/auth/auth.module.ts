import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User, UserSchema } from './schema/user.schema';
import { JwtStrategy } from './strategie/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailService } from 'src/email/email.service';

/**
 * Módulo de autenticación.
 *
 * @remarks
 * Gestiona el registro, inicio de sesión, validación de usuarios y recuperación de contraseñas.
 * Configura los esquemas, controladores y proveedores necesarios para la autenticación.
 */
@Module({
  imports: [
    // Configura el esquema de Mongoose para la colección de usuarios.
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // Importa el módulo de Passport para la autenticación.
    PassportModule,
    // Configura el módulo JWT con la clave secreta y las opciones de expiración.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '2h' },
      }),
    }),
  ],
  controllers: [
    // Controlador que maneja las rutas relacionadas con la autenticación.
    AuthController,
  ],
  providers: [
    // Proveedores que gestionan la lógica de negocio de la autenticación.
    // Incluye el servicio de autenticación, la estrategia JWT y el servicio de email.
    AuthService, 
    JwtStrategy,
    EmailService,
  ],
})
export class AuthModule {}