import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schema/user.schema';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { ProfileResponseDto } from './dto/profile.dto';
import { RecoverPasswordDto, RequestPasswordRecoverDto } from './dto/passwordRecover.dto';
import { z } from 'zod';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { UpdateNameDto } from './dto/updateName.dto';
import { RefreshTokenDto, RefreshTokenResponseDto } from './dto/refreshToken.dto';
import { EmailService } from 'src/email/email.service';
import { ValidateAccessTokenResponseDto } from './dto/validateAccessToken.dto';
import { GiveAppAccessDto } from './dto/giveAppAccess.dto';
import { GetUsersDto } from './dto/getUsers.dto';
import { DeleteUserDto } from './dto/deleteUser.dto';

// Esquema de validación para email, contraseña y código de recuperación
const emailSchema = z.string().email({ message: 'Invalid email format' });
const passwordSchema = z.string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .max(16, { message: 'Password must be at most 16 characters long' })
  .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' });
const recoveryCodeSchema = z.string()
  .length(6, { message: 'Recovery code must be exactly 6 characters long' })
  .regex(/^[A-Z0-9]+$/, { message: 'Recovery code must contain only uppercase letters and numbers' });

/**
 * Servicio de autenticación.
 *
 * @remarks
 * Gestiona el registro, inicio de sesión, generación y validación de tokens, recuperación de contraseña y actualización de datos de usuario.
 */
@Injectable()
export class AuthService {
  /**
   * Constructor del servicio de autenticación.
   *
   * @param userModel - Modelo de usuario inyectado para interactuar con la base de datos.
   * @param jwtService - Servicio JWT para generar y verificar tokens.
   * @param emailService - Servicio para el envío de correos electrónicos.
   */
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Registra un nuevo usuario en la base de datos.
   *
   * @param token - Token de acceso del usuario autenticado (debe ser admin).
   * @param userData - Datos del usuario a registrar.
   * @throws ConflictException si el usuario ya existe.
   * @throws UnauthorizedException si el token es inválido o el usuario no es admin.
   */
  async register(token: string, userData: RegisterDto): Promise<void> {
    // Verificar el token de acceso
    const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
    if (!payload) {
      throw new UnauthorizedException('Invalid access token');
    }
    // Verificar si el usuario existe en la base de datos
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('Token does not belong to a valid user');
    }
    // Verificar si el usuario tiene permisos para registrarse
    if (!user.isAdmin) {
      throw new UnauthorizedException('You do not have permission to register users');
    }
    // Validar email y contraseña
    emailSchema.parse(userData.email);
    passwordSchema.parse(userData.password);

    // Verificar si el usuario ya existe
    const foundUser = await this.findUserByEmail(userData.email);
    if (foundUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser = new this.userModel({
      ...userData,
      passwordHash: hashedPassword,
    });
    await newUser.save();
  }

  /**
   * Autentica a un usuario y genera tokens de acceso y refresco.
   *
   * @param userData - Credenciales del usuario.
   * @returns Un objeto con los tokens generados y datos básicos del usuario.
   * @throws UnauthorizedException si las credenciales son inválidas.
   */
  async login(userData: LoginDto): Promise<LoginResponseDto> {
    // Validar email y contraseña
    emailSchema.parse(userData.email);
    passwordSchema.parse(userData.password);

    const foundUser = await this.findUserByEmail(userData.email);
    if (!foundUser || !(await bcrypt.compare(userData.password, foundUser.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generar el payload para los tokens
    const payload = { email: foundUser.email, sub: foundUser._id };

    // Generar el access token
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2h' });

    // Generar el refresh token
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Obtener la fecha de expiración real del refresh token desde el JWT
    const decodedRefresh: any = this.jwtService.decode(refreshToken);
    const refreshTokenExpiresAt = new Date(decodedRefresh.exp * 1000);

    // Obtener la fecha de expiración real del access token desde el JWT
    const decodedAccess: any = this.jwtService.decode(accessToken);
    const accessTokenExpiresAt = new Date(decodedAccess.exp * 1000);

    // Guardar los tokens y las fechas de expiración en la base de datos
    foundUser.accessToken = accessToken;
    foundUser.accessTokenExpiresAt = accessTokenExpiresAt;
    foundUser.refreshToken = refreshToken;
    foundUser.refreshTokenExpiresAt = refreshTokenExpiresAt;
    await foundUser.save();

    const loginResponse: LoginResponseDto = {
      accessToken,
      refreshToken,
      firstName: foundUser.firstName,
      lastName: foundUser.lastName,
      isAdmin: foundUser.isAdmin,
      appAccess: foundUser.appAccess,
    };

    // Devolver los tokens y el nombre de usuario
    return loginResponse;
  }

  /**
   * Genera un nuevo token de acceso utilizando un token de refresco válido.
   *
   * @param userData - Objeto que contiene el token de refresco.
   * @returns Un objeto con el nuevo token de acceso y refresh.
   * @throws BadRequestException si no se proporciona un token de refresco.
   * @throws UnauthorizedException si el token de refresco es inválido o ha expirado.
   */
  async refreshToken(userData: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
    if (!userData.refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(userData.refreshToken, { secret: process.env.JWT_SECRET });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('Token does not belong to a valid user');
    }
    // Comparar el refresh token y su expiración usando el valor decodificado del JWT
    if (
      user.refreshToken !== userData.refreshToken ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }

    // Generar nuevos tokens
    const newAccessToken = this.jwtService.sign({ email: payload.email, sub: payload.sub }, { expiresIn: '2h' });
    const newDecodedAccess: any = this.jwtService.decode(newAccessToken);
    const newAccessTokenExpiresAt = new Date(newDecodedAccess.exp * 1000);

    const newRefreshToken = this.jwtService.sign({ email: payload.email, sub: payload.sub }, { expiresIn: '7d' });
    const newDecodedRefresh: any = this.jwtService.decode(newRefreshToken);
    const newRefreshTokenExpiresAt = new Date(newDecodedRefresh.exp * 1000);

    await this.userModel.findByIdAndUpdate(payload.sub, {
      accessToken: newAccessToken,
      accessTokenExpiresAt: newAccessTokenExpiresAt,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt: newRefreshTokenExpiresAt,
    }).exec();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Verifica si un token de acceso es válido y pertenece a un usuario.
   *
   * @param accessToken - Token de acceso.
   * @returns Un objeto con la fecha de expiración del token.
   * @throws UnauthorizedException si el token de acceso es inválido, ha expirado o no pertenece a un usuario.
   * @throws BadRequestException si no se proporciona un token de acceso.
   */
  async validateAccessToken(accessToken: string): Promise<ValidateAccessTokenResponseDto> {
    if (!accessToken) {
      throw new BadRequestException('Access token is required');
    }
    // Verificar el token de acceso
    const payload = this.jwtService.verify(accessToken, { secret: process.env.JWT_SECRET });
    if (!payload) {
      throw new UnauthorizedException('Invalid access token');
    }
    // Verificar si el usuario existe en la base de datos
    const user = await this.userModel.findById(payload.sub).exec();
    if (!user) {
      throw new UnauthorizedException('Token does not belong to a valid user');
    }
    // Verificar si el token de acceso coincide con el almacenado en la base de datos
    if (user.accessToken !== accessToken) {
      throw new UnauthorizedException('Access token does not match the stored token');
    }
    // Verificar si el token ha expirado
    if (!user.accessTokenExpiresAt || user.accessTokenExpiresAt < new Date()) {
      throw new UnauthorizedException('Access token has expired');
    }

    // Devolver la fecha de expiración del token
    const validateAccessTokenResponse: ValidateAccessTokenResponseDto = {
      expiresAt: user.accessTokenExpiresAt,
    };
    return validateAccessTokenResponse;

  }

  /**
   * Cierra la sesión del usuario eliminando los tokens de acceso y refresco.
   *
   * @param userId - ID del usuario.
   * @throws NotFoundException si el usuario no existe.
   */
  async logout(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Eliminar los tokens de acceso y refresco
    user.accessToken = null;
    user.accessTokenExpiresAt = null;
    user.refreshToken = null;
    user.refreshTokenExpiresAt = null;

    // Guardar los cambios en la base de datos
    await user.save();
  }

  /**
   * Busca un usuario en la base de datos por su correo electrónico.
   *
   * @param email - Correo electrónico del usuario.
   * @returns El usuario encontrado o `null` si no existe.
   */
  private async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Obtiene los datos del perfil de un usuario por su ID.
   *
   * @param userId - ID del usuario.
   * @returns Un objeto con los datos del perfil del usuario.
   * @throws NotFoundException si el usuario no existe.
   */
  async findProfileData(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userModel.findById(userId).exec();
    // Verificar si el usuario existe
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const profileResponse: ProfileResponseDto = {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }
    return profileResponse;
  }

  /**
   * Solicita la recuperación de contraseña enviando un código al correo.
   *
   * @param userData - Datos del usuario que solicita la recuperación.
   * @throws NotFoundException si el usuario no existe.
   */
  async requestPasswordRecover(userData: RequestPasswordRecoverDto): Promise<void> {
    const user = await this.findUserByEmail(userData.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generar un código de recuperación aleatorio de 6 caracteres (letras mayúsculas y números)
    const recoveryCode = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Guardar el código de recuperación en la base de datos
    user.recoveryCode = recoveryCode;
    user.recoveryCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    await user.save();

    // Enviar el código al correo del usuario
    await this.emailService.sendRecoveryEmail(userData.email, recoveryCode);
  }

  /**
   * Restablece la contraseña del usuario si el código de recuperación es válido.
   *
   * @param userData - DTO con email, código de recuperación y nueva contraseña.
   * @throws UnauthorizedException si el código es inválido o ha expirado.
   */
  async recoverPassword(userData: RecoverPasswordDto): Promise<void> {
    // Validar email, nueva contraseña y código de recuperación
    emailSchema.parse(userData.email);
    passwordSchema.parse(userData.newPassword);
    recoveryCodeSchema.parse(userData.recoveryCode);

    const user = await this.findUserByEmail(userData.email);
    if (!user || user.recoveryCode !== userData.recoveryCode || !user.recoveryCodeExpiresAt || user.recoveryCodeExpiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired recovery code');
    }

    // Actualizar la contraseña del usuario
    user.passwordHash = await bcrypt.hash(userData.newPassword, 10);
    user.recoveryCode = null;
    user.recoveryCodeExpiresAt = null;
    await user.save();
  }

  /**
   * Cambia el nombre y apellido del usuario.
   *
   * @param userId - ID del usuario.
   * @param userData - Objeto con el nuevo nombre y apellido.
   * @throws NotFoundException si el usuario no existe.
   */
  async updateName(userId: string, userData: UpdateNameDto): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.firstName = userData.firstName;
    user.lastName = userData.lastName;
    await user.save();
  }

  /**
   * Cambia la contraseña del usuario verificando la contraseña actual.
   *
   * @param userId - ID del usuario.
   * @param userData - Objeto con la contraseña actual y la nueva contraseña.
   * @throws UnauthorizedException si la contraseña actual es incorrecta.
   */
  async changePassword(userId: string, userData: ChangePasswordDto): Promise<void> {
    // Validar las contraseñas
    passwordSchema.parse(userData.newPassword);
    passwordSchema.parse(userData.currentPassword);

    const user = await this.userModel.findById(userId).exec();
    if (!user || !(await bcrypt.compare(userData.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(userData.newPassword, 10);
    await user.save();
  }

  /**
   * Obtiene una lista de todos los usuarios del sistema.
   * @param userId - ID del usuario que solicita la lista (debe ser admin).
   * @returns Un array de objetos con los datos de los usuarios.
   * @throws UnauthorizedException si el usuario no es admin.
   */
  async getUsers(): Promise<GetUsersDto[]> {
    const users = await this.userModel.find().exec();
    return users.map(user => ({
      _id: String(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      appAccess: user.appAccess,
    }));
  }

  /**
   * Asigna accesos a las aplicaciones del sistema al usuario.
   * @param userId - ID del usuario admin que realiza la operación.
   * @param userData - Objeto que contiene el ID del usuario objetivo y los accesos a las aplicaciones.
   * @throws UnauthorizedException si el usuario no es admin.
   * @throws NotFoundException si el usuario objetivo no existe.
   */
  async giveAppAccess(userId: string, userData: GiveAppAccessDto): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isAdmin) {
      throw new UnauthorizedException('You do not have permission to give app access');
    }
    
    const targetUser = await this.userModel.findById(userData.userId).exec();
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Asegurar que appAccess existe
    if (!targetUser.appAccess) {
      targetUser.appAccess = { catalog: false };
    }

    targetUser.appAccess.catalog = userData.catalog;

    // Marcar el campo modificado para que Mongoose lo detecte
    targetUser.markModified('appAccess');
    await targetUser.save();
  }

  async deleteUser(userId: string, userData: DeleteUserDto): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isAdmin) {
      throw new UnauthorizedException('You do not have permission to delete users');
    }

    const targetUser = await this.userModel.findById(userData._id).exec();
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (targetUser.isAdmin) {
      throw new UnauthorizedException('You do not have permission to delete this user');
    }

    await targetUser.deleteOne();
  }
}
