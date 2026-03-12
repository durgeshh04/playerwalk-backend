import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DRIZZLE } from 'src/database/database.module';
import { refreshTokens } from 'src/database/schema';
import type { DrizzleDB, DrizzleTrx } from 'src/database/database.module';
import {
  generateRefreshToken,
  calculateExpiresAt,
} from '../helpers/token.helper';

@Injectable()
export class TokenService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly jwtService: JwtService,
  ) {}

  // ADDED: only generates and stores refresh token, returns rawToken string
  // use this when access token is already generated separately
  async generateRefreshToken(
    accountId: string,
    trx?: DrizzleTrx,
  ): Promise<string> {
    const dbClient = trx ?? this.db;
    const { rawToken, tokenId, tokenHash } = await generateRefreshToken();
    const expiresAt = calculateExpiresAt(7);

    await dbClient.insert(refreshTokens).values({
      accountId,
      tokenId,
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  // generates both access + refresh together
  // use this in the refresh token endpoint
  async generateTokenPair(
    account: { id: string; email: string },
    trx?: DrizzleTrx,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const dbClient = trx ?? this.db;

    const accessToken = this.jwtService.sign({
      sub: account.id,
      email: account.email,
    });

    const { rawToken, tokenId, tokenHash } = await generateRefreshToken();
    const expiresAt = calculateExpiresAt(7);

    await dbClient.insert(refreshTokens).values({
      accountId: account.id,
      tokenId,
      tokenHash,
      expiresAt,
    });

    return { accessToken, refreshToken: rawToken };
  }
}
