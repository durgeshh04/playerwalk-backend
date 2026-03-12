// src/common/common.module.ts

import { Module, Global } from '@nestjs/common';
import { EmailService } from './services/email.service';
import { TokenService } from './services/token.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global() // makes EmailService available everywhere without importing CommonModule
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [EmailService, TokenService],
  exports: [EmailService, TokenService],
})
export class CommonModule {}
