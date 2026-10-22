import { createPublicKey } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';

interface GoogleClaims extends JwtPayload {
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}
interface GoogleJwk { kid: string; [key: string]: unknown }
let cachedKeys: GoogleJwk[] = [];
let cacheExpiresAt = 0;

async function getGoogleKeys(): Promise<GoogleJwk[]> {
  if (Date.now() < cacheExpiresAt && cachedKeys.length) return cachedKeys;
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Google verification service is unavailable');
  const data = await response.json() as { keys?: GoogleJwk[] };
  if (!Array.isArray(data.keys) || !data.keys.length) throw new Error('Google signing keys are unavailable');
  cachedKeys = data.keys;
  const maxAge = Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/i)?.[1] || 300);
  cacheExpiresAt = Date.now() + Math.min(maxAge, 3600) * 1000;
  return cachedKeys;
}

export async function verifyGoogleIdToken(idToken: unknown): Promise<GoogleClaims> {
  const audience = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!audience) throw Object.assign(new Error('Google sign-in is not configured on the server'), { status: 503 });
  if (typeof idToken !== 'string' || idToken.length > 10000) throw Object.assign(new Error('Invalid Google credential'), { status: 401 });
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || decoded.header.alg !== 'RS256' || !decoded.header.kid) throw Object.assign(new Error('Invalid Google credential'), { status: 401 });
  let keys: GoogleJwk[];
  try { keys = await getGoogleKeys(); } catch { throw Object.assign(new Error('Google sign-in could not be verified. Please try again.'), { status: 503 }); }
  let jwk = keys.find(key => key.kid === decoded.header.kid);
  if (!jwk) {
    cacheExpiresAt = 0;
    try { jwk = (await getGoogleKeys()).find(key => key.kid === decoded.header.kid); } catch { /* handled below */ }
  }
  if (!jwk) throw Object.assign(new Error('Invalid Google credential'), { status: 401 });
  try {
    const publicKey = createPublicKey({ key: jwk as unknown as import('crypto').JsonWebKey, format: 'jwk' });
    const claims = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience,
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as GoogleClaims;
    const email = claims.email?.trim().toLowerCase();
    if (typeof claims.sub !== 'string' || !claims.sub || !email || !(claims.email_verified === true || claims.email_verified === 'true') || !email.endsWith('@gmail.com')) {
      throw Object.assign(new Error('Use a verified Gmail account to continue.'), { status: 403 });
    }
    return { ...claims, email };
  } catch (error: any) {
    if (error.status) throw error;
    throw Object.assign(new Error('Invalid or expired Google credential'), { status: 401 });
  }
}
