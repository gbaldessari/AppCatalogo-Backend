import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Servicio para el envío de correos electrónicos.
 *
 * @remarks
 * Utilizado principalmente para enviar códigos de recuperación de contraseña y otras notificaciones por email.
 */
@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  /**
   * Inicializa el transporte de nodemailer utilizando Gmail.
   *
   * @remarks
   * Las credenciales se obtienen de las variables de entorno.
   */
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  /**
   * Envía un correo electrónico con un código de recuperación de contraseña.
   *
   * @param to - Dirección de correo electrónico del destinatario.
   * @param recoveryCode - Código de recuperación que se enviará al usuario.
   * @returns Una promesa que se resuelve cuando el correo ha sido enviado.
   */
  async sendRecoveryEmail(to: string, recoveryCode: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject: 'Recuperación de contraseña',
      text: `Tu código de recuperación es: ${recoveryCode}`,
      html: `<p>Tu código de recuperación es: <strong>${recoveryCode}</strong></p>`,
    };

    await this.transporter.sendMail(mailOptions);
  }
}