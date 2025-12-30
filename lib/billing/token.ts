import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const PURCHASE_TOKEN_SECRET = process.env.PURCHASE_TOKEN_SECRET;

if (!PURCHASE_TOKEN_SECRET) {
  throw new Error('Please define the PURCHASE_TOKEN_SECRET environment variable inside .env');
}

export interface PurchaseTokenPayload {
  email: string;
  nonce: string;
  iat: number;
  exp: number;
}

export function signPurchaseToken(email: string, expiresInSeconds = 60 * 30): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: PurchaseTokenPayload = {
    email,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: now,
    exp: now + expiresInSeconds,
  };

  return jwt.sign(payload, PURCHASE_TOKEN_SECRET as string, {
    algorithm: 'HS256',
  });
}

export function verifyPurchaseToken(token: string): PurchaseTokenPayload | null {
  try {
    const raw = jwt.verify(token, PURCHASE_TOKEN_SECRET as string);
    const payload = raw as unknown as Partial<PurchaseTokenPayload>;
    if (!payload?.email || !payload?.nonce) return null;
    if (typeof payload.email !== 'string' || typeof payload.nonce !== 'string') return null;
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null;
    return payload as PurchaseTokenPayload;
  } catch {
    return null;
  }
}
