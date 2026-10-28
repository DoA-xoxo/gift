
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySessionToken(token) {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32 || !token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [encoded, signature] = parts;

    if (
      !/^[A-Za-z0-9_-]+$/.test(encoded) ||
      !/^[A-Za-z0-9_-]+$/.test(signature)
    ) {
      return null;
    }

    const expected = createHmac('sha256', secret)
      .update(encoded)
      .digest();

    const actual = Buffer.from(signature, 'base64url');

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    );

    if (
      typeof payload.nickname !== 'string' ||
      !payload.nickname ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { nickname: payload.nickname, exp: payload.exp };
  } catch {
    return null;
  }
}
