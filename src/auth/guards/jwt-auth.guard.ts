// src/auth/guards/jwt-auth.guard.ts

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// AuthGuard('jwt') tells passport to use the JwtStrategy
// that's it — all the logic lives in the strategy
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
