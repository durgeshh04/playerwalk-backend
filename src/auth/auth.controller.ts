import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { RegistrationDto } from './dto/registration.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { LogoutDto } from './dto/logout.dto';

@ApiTags('Authentication Module')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiBody({ type: RegistrationDto })
  signup(@Body() dto: RegistrationDto): Promise<object> {
    return this.authService.signup(dto);
  }

  @Post('verify-otp')
  @ApiBody({ type: VerifyOtpDto })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<object> {
    return this.authService.verifyOtp(dto);
  }

  @Post('login')
  @ApiBody({ type: LoginDto })
  login(@Body() dto: LoginDto): Promise<object> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiBody({ type: RefreshTokenDto })
  refreshToken(@Body() dto: RefreshTokenDto): Promise<object> {
    return this.authService.refreshToken(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard) // protect this route
  @ApiBearerAuth() // tells Swagger this needs a Bearer token
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      success: true,
      message: 'Authenticated user fetched',
      data: user,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard) // must be logged in to logout
  @ApiBearerAuth() // swagger — needs Bearer token in header
  @ApiBody({ type: LogoutDto })
  logout(@Body() dto: LogoutDto): Promise<object> {
    return this.authService.logout(dto);
  }
}
