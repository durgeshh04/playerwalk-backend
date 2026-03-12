// src/common/services/email.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    // create transporter once when service initializes
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"PlayerWalk" <${this.configService.get('MAIL_USER')}>`,
        to: email,
        subject: 'Your PlayerWalk verification code',
        // plain text fallback
        text: `Your verification code is: ${otp}. It expires in 15 minutes.`,
        // html email
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #333;">Verify your email</h2>
            <p>Your PlayerWalk verification code is:</p>
            <h1 style="letter-spacing: 8px; color: #4F46E5;">${otp}</h1>
            <p style="color: #666; font-size: 14px;">This code expires in 15 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });

      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error('Failed to send OTP email', (error as Error).stack);
      // don't throw — log and continue
      // email failure should not break the signup flow
    }
  }
}
