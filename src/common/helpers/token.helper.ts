// src/common/helpers/token.helper.ts

import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

export interface GeneratedRefreshToken {
  rawToken: string;    // sent to client  → "tokenId.tokenSecret"
  tokenId: string;     // stored plain    → for DB lookup
  tokenHash: string;   // stored hashed   → for verification
}

export async function generateRefreshToken(): Promise<GeneratedRefreshToken> {
  const tokenId = uuidv4();
  const tokenSecret = uuidv4();
  const tokenHash = await bcrypt.hash(tokenSecret, 10);
  const rawToken = `${tokenId}.${tokenSecret}`;
  return { rawToken, tokenId, tokenHash };
}

export function splitRefreshToken(rawToken: string): {
  tokenId: string;
  tokenSecret: string;
} {
  const parts = rawToken.split('.');
  // UUID v4 has 5 parts separated by hyphens
  // when we join two UUIDs with "." we get exactly 2 parts
  if (parts.length !== 2) {
    throw new Error('Invalid token format');
  }
  return { tokenId: parts[0], tokenSecret: parts[1] };
}

export function calculateExpiresAt(days: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}
