import { Controller, Post, Body, UseGuards, Request, Get, Patch, BadRequestException, Query, Delete } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RecoverPasswordDto, RequestPasswordRecoverDto } from './dto/passwordRecover.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { UpdateNameDto } from './dto/updateName.dto';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import { GiveAppAccessDto } from './dto/giveAppAccess.dto';
import { DeleteUserDto } from './dto/deleteUser.dto';

/**
 * Controlador para gestionar la autenticación y operaciones relacionadas con usuarios.
 *
 * @remarks
 * Expone endpoints para registro, login, validación de tokens, recuperación de contraseña, perfil y actualización de datos.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Registra un nuevo usuario en el sistema.
   *
   * @param registerDto - Datos necesarios para registrar al usuario.
   * @param req - Objeto de solicitud HTTP con encabezado de autorización.
   * @throws BadRequestException Si el encabezado de autorización es inválido.
   */
  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Authorization header is missing or invalid');
    }
    const token = authHeader.split(' ')[1];
    return await this.authService.register(token, registerDto);
  }

  /**
   * Autentica a un usuario y genera un token JWT.
   *
   * @param loginDto - Credenciales del usuario para iniciar sesión.
   * @returns Un token JWT y datos del usuario si las credenciales son válidas.
   */
  @Patch('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  /**
   * Valida el token de acceso del usuario.
   *
   * @param req - Objeto de solicitud HTTP con encabezado de autorización.
   * @returns Información sobre la validez y expiración del token.
   * @throws BadRequestException Si el encabezado de autorización es inválido.
   */
  @UseGuards(JwtAuthGuard)
  @Get('validate-token')
  async validateToken(@Request() req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException('Authorization header is missing or invalid');
    }
    const token = authHeader.split(' ')[1];
    return await this.authService.validateAccessToken(token);
  }

  /**
   * Genera un nuevo token de acceso utilizando un token de refresco válido.
   *
   * @param refreshTokenDto - DTO con el token de refresco.
   * @returns Un nuevo token de acceso y de refresco.
   */
  @Patch('refresh-token')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * Obtiene los datos del perfil del usuario autenticado.
   *
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @returns Datos del perfil del usuario.
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return await this.authService.findProfileData(req.user.userId);
  }

  /**
   * Solicita la recuperación de contraseña.
   *
   * @param requestPasswordRecoverDto - DTO con el correo del usuario.
   * @returns Resultado de la solicitud de recuperación.
   */
  @Patch('request-password-reset')
  async requestPasswordReset(@Body() requestPasswordRecoverDto: RequestPasswordRecoverDto) {
    return await this.authService.requestPasswordRecover(requestPasswordRecoverDto);
  }

  /**
   * Restablece la contraseña del usuario.
   *
   * @param recoverPasswordDto - DTO con los datos para restablecer la contraseña.
   * @returns Resultado del restablecimiento de contraseña.
   */
  @Patch('reset-password')
  async resetPassword(@Body() recoverPasswordDto: RecoverPasswordDto) {
    return await this.authService.recoverPassword(recoverPasswordDto);
  }

  /**
   * Cierra la sesión del usuario autenticado eliminando los tokens de acceso.
   *
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @returns Resultado del cierre de sesión.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('logout')
  async logout(@Request() req) {
    return await this.authService.logout(req.user.userId);
  }

  /**
   * Cambia el nombre y apellido del usuario autenticado.
   *
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @param updateNameDto - DTO con el nuevo nombre y apellido.
   * @returns Resultado de la actualización de nombre.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('update-name')
  async updateName(@Request() req, @Body() updateNameDto: UpdateNameDto) {
    return await this.authService.updateName(req.user.userId, updateNameDto);
  }

  /**
   * Cambia la contraseña del usuario autenticado.
   *
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @param changePasswordDto - DTO con la contraseña actual y la nueva contraseña.
   * @returns Resultado del cambio de contraseña.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('change-password')
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return await this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  /**
   * Asigna accesos a las aplicaciones del sistema al usuario autenticado.
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @param giveAppAccessDto - Objeto que contiene los accesos a las aplicaciones.
   * @returns Resultado de la asignación de accesos.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('give-app-access')
  async giveAppAccess(@Request() req, @Body() giveAppAccessDto: GiveAppAccessDto) {
    return await this.authService.giveAppAccess(req.user.userId, giveAppAccessDto);
  }

  /**
   * Obtiene una lista de usuarios del sistema.
   * @param req - Objeto de solicitud HTTP con información del usuario autenticado.
   * @returns Lista de usuarios con sus datos básicos.
   */
  @UseGuards(JwtAuthGuard)
  @Get('get-users')
  async getUsers() {
    return await this.authService.getUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-user')
  async deleteUser(@Request() req, @Query() deleteUserDto: DeleteUserDto) {
    return await this.authService.deleteUser(req.user.userId, deleteUserDto);
  }
}
