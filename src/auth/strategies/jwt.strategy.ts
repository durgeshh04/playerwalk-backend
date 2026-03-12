import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/database/database.module';
import type { DrizzleDB } from 'src/database/database.module';
import { accounts } from 'src/database/schema';

// this is the shape of data inside your JWT payload
// remember when you signed: { sub: account.id, email: account.email }
export interface JwtPayload {
  sub: string; // account id
  email: string;
}

// this is what gets attached to request.user after validation
export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly configService: ConfigService,
  ) {
    super({
      // tells passport where to look for the token
      // looks for: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // if token is expired → reject it
      ignoreExpiration: false,

      // same secret used to sign tokens in TokenService
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  // passport calls this automatically after token signature is verified
  // payload is the decoded JWT — { sub, email, iat, exp }
  // whatever you return here gets attached to request.user
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // verify account still exists and is active
    const [account] = await this.db
      .select()
      .from(accounts)
      .where(eq(accounts.id, payload.sub))
      .limit(1);

    if (!account || !account.isActive) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      });
    }

    // this gets attached to request.user
    return {
      id: account.id,
      email: account.email,
    };
  }
}
