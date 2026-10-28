
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySessionToken(token) {
  try {
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;

    const expected = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    if (
      typeof session.nickname !== 'string' ||
      typeof session.exp !== 'number' ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}
