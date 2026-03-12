import {
  BadRequestException,
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { RegistrationDto } from './dto/registration.dto';
import { DRIZZLE } from 'src/database/database.module';
import {
  accounts,
  roles,
  userProfile,
  userRoles,
  refreshTokens,
  otps,
} from 'src/database/schema';
import * as bcrypt from 'bcrypt';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { OTP_TYPES } from 'src/common/constants/otp-types.constants';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import { LoginDto } from './dto/login.dto';
import {
  generateRefreshToken,
  splitRefreshToken,
} from 'src/common/helpers/token.helper';
import type { DrizzleDB } from 'src/database/database.module';
import { TokenService } from 'src/common/services/token.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { EmailService } from 'src/common/services/email.service';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
    private readonly tokenService: TokenService,
    private readonly emailService: EmailService,
  ) {}

  async signup(dto: RegistrationDto): Promise<object> {
    try {
      const existingAccount = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, dto.email));

      if (existingAccount.length > 0 && existingAccount[0].isVerified) {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'This email is already registered',
        });
      }

      if (existingAccount.length > 0 && !existingAccount[0].isVerified) {
        await this.generateAndSendOtp(
          existingAccount[0].id,
          OTP_TYPES.EMAIL_VERIFICATION,
          this.db,
        );
        return {
          success: true,
          message: 'Verification email resent. Please check your inbox.',
        };
      }

      const hashedPassword = await bcrypt.hash(dto.password, 12);

      const [sportsfanRole] = await this.db
        .select()
        .from(roles)
        .where(eq(roles.role, 'sportsfan'))
        .limit(1);
      if (!sportsfanRole) {
        throw new BadRequestException({
          code: 'ROLE_NOT_FOUND',
          message: 'Default role not found. Contact support.',
        });
      }

      const newAccount = await this.db.transaction(async (trx) => {
        const [account] = await trx
          .insert(accounts)
          .values({
            email: dto.email.toLowerCase(),
            password: hashedPassword,
          })
          .returning();

        await trx.insert(userProfile).values({
          accountId: account.id,
        });

        await trx.insert(userRoles).values({
          accountId: account.id,
          roleId: sportsfanRole.id,
        });

        await this.generateAndSendOtp(
          account.id,
          OTP_TYPES.EMAIL_VERIFICATION,
          trx,
        );

        return account;
      });

      return {
        success: true,
        message: 'Account created. Please verify your email.',
        data: {
          email: newAccount.email,
          isVerified: newAccount.isVerified,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error('Signup failed', (error as Error).stack);
      throw new InternalServerErrorException('Signup failed, please retry');
    }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<object> {
    try {
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, dto.email.toLowerCase()))
        .limit(1);

      if (!account) {
        throw new BadRequestException({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'No account found with this email',
        });
      }

      if (account.isVerified) {
        throw new BadRequestException({
          code: 'ACCOUNT_ALREADY_VERIFIED',
          message: 'This account is already verified',
        });
      }

      const [otpRecord] = await this.db
        .select()
        .from(otps)
        .where(
          and(
            eq(otps.accountId, account.id),
            eq(otps.type, OTP_TYPES.EMAIL_VERIFICATION),
          ),
        )
        .orderBy(desc(otps.createdAt))
        .limit(1);

      if (!otpRecord) {
        throw new BadRequestException({
          code: 'OTP_NOT_FOUND',
          message: 'No OTP found. Please request a new one.',
        });
      }

      if (otpRecord.isUsed) {
        throw new BadRequestException({
          code: 'OTP_ALREADY_USED',
          message: 'This OTP has already been used. Please request a new one.',
        });
      }

      if (new Date() > otpRecord.expiresAt) {
        throw new BadRequestException({
          code: 'OTP_EXPIRED',
          message: 'OTP has expired. Please request a new one.',
        });
      }

      if (otpRecord.otp !== dto.otp) {
        throw new BadRequestException({
          code: 'INVALID_OTP',
          message: 'Incorrect OTP. Please try again.',
        });
      }

      const accessToken = this.jwtService.sign({
        sub: account.id,
        email: account.email,
      });

      const tokens = await this.db.transaction(async (trx) => {
        await trx
          .update(accounts)
          .set({ isVerified: true })
          .where(eq(accounts.id, account.id));
        await trx
          .update(otps)
          .set({ isUsed: true })
          .where(eq(otps.id, otpRecord.id));

        const refreshToken = await this.tokenService.generateRefreshToken(
          account.id,
          trx,
        );
        return { accessToken, refreshToken };
      });

      return {
        success: true,
        message: 'Email verified successfully',
        data: tokens,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Otp verification failed', (error as Error).stack);
      throw new InternalServerErrorException(
        'Otp verification failed, please retry',
      );
    }
  }

  async login(dto: LoginDto): Promise<object> {
    try {
      const [existingUser] = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.email, dto.email.toLowerCase()))
        .limit(1);

      if (!existingUser) {
        throw new UnauthorizedException({
          code: 'INVALID_EMAIL_AND_PASSWORD',
          message: 'Invalid email and password',
        });
      }

      if (!existingUser.isVerified) {
        throw new BadRequestException({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Please verify your mail first by registring again',
        });
      }

      if (!existingUser.isActive) {
        throw new BadRequestException({
          code: 'USER_NOT_ACTIVE',
          message: 'Your account has been deactivated',
        });
      }

      const checkPassword = await bcrypt.compare(
        dto.password,
        existingUser.password,
      );
      if (!checkPassword) {
        throw new UnauthorizedException({
          code: 'INVALID_EMAIL_AND_PASSWORD',
          message: 'Invalid email and password',
        });
      }

      const accessToken = this.jwtService.sign({
        sub: existingUser.id,
        email: existingUser.email,
      });

      const tokens = await this.db.transaction(async (trx) => {
        const refreshToken = await this.tokenService.generateRefreshToken(
          existingUser.id,
          trx,
        );
        return { accessToken, refreshToken };
      });

      return {
        success: true,
        message: 'Login successful',
        data: tokens,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Login request failed', (error as Error).stack);
      throw new InternalServerErrorException('Login request failed');
    }
  }

  async refreshToken(dto: RefreshTokenDto): Promise<object> {
    try {
      // Step 1 — split the incoming token into its two parts
      // client sends "tokenId.tokenSecret" — we split on "."
      let tokenId: string;
      let tokenSecret: string;

      try {
        const split = splitRefreshToken(dto.refreshToken);
        tokenId = split.tokenId;
        tokenSecret = split.tokenSecret;
      } catch {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        });
      }

      // Step 2 — find the token row by tokenId (plain lookup, one query, instant)
      // we can't query by hash so we use tokenId as the lookup key
      const [storedToken] = await this.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenId, tokenId))
        .limit(1);

      if (!storedToken) {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        });
      }

      // Step 3 — check expiry before doing any more work
      if (new Date() > storedToken.expiresAt) {
        throw new UnauthorizedException({
          code: 'REFRESH_TOKEN_EXPIRED',
          message: 'Session expired. Please login again.',
        });
      }

      // Step 4 — verify the secret part against the stored hash
      // this proves the client actually owns this token
      const isValid = await bcrypt.compare(tokenSecret, storedToken.tokenHash);
      if (!isValid) {
        throw new UnauthorizedException({
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Invalid refresh token',
        });
      }

      // Step 5 — get the account using accountId FROM the token row
      // never trust accountId from client — always derive it from DB
      const [account] = await this.db
        .select()
        .from(accounts)
        .where(eq(accounts.id, storedToken.accountId))
        .limit(1);

      if (!account) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_NOT_FOUND',
          message: 'Account not found',
        });
      }

      if (!account.isActive) {
        throw new UnauthorizedException({
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated',
        });
      }

      // Step 6 — rotate tokens inside a transaction
      // delete old token + issue new pair atomically
      // if either fails — neither happens, old token stays valid
      const tokens = await this.db.transaction(async (trx) => {
        // delete old refresh token — this is rotation
        // old token is now dead even before new one is stored
        await trx
          .delete(refreshTokens)
          .where(eq(refreshTokens.tokenId, tokenId));

        // generate new access + refresh token pair
        // generateTokenPair stores new refresh token in DB inside trx
        return await this.tokenService.generateTokenPair(account, trx);
      });

      return {
        success: true,
        message: 'Tokens refreshed successfully',
        data: tokens,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Token refresh failed', (error as Error).stack);
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  private async generateAndSendOtp(
    accountId: string,
    type: string,
    db,
  ): Promise<void> {
    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);

      await db.insert(schema.otps).values({
        accountId,
        otp,
        type,
        isUsed: false,
        expiresAt,
      });

      // CHANGED: need account email to send mail
      // fetch email from accounts table
      const [account] = await this.db
        .select({ email: accounts.email })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      if (account) {
        // CHANGED: replaced logger.log with real email
        await this.emailService.sendOtp(account.email, otp);
      }
    } catch (error) {
      this.logger.error('OTP generation failed', (error as Error).stack);
      throw new InternalServerErrorException('OTP generation failed');
    }
  }

  async logout(dto: LogoutDto): Promise<object> {
    try {
      // Step 1 — split token to get tokenId for DB lookup
      // we only need tokenId — no need to verify secret on logout
      let tokenId: string;
      try {
        const split = splitRefreshToken(dto.refreshToken);
        tokenId = split.tokenId;
      } catch {
        // if token format is invalid — user is already effectively logged out
        return {
          success: true,
          message: 'Logged out successfully',
        };
      }

      // Step 2 — delete the refresh token row by tokenId
      // no expiry check, no bcrypt.compare — just delete
      // if row doesn't exist — that's fine, session is already gone
      await this.db
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenId, tokenId));

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Logout failed', (error as Error).stack);
      throw new InternalServerErrorException('Logout failed');
    }
  }
}
