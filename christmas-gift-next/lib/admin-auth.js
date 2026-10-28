
import crypto from 'node:crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET;
}

function sign(value, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(value)
    .digest('base64url');
}

export function createAdminToken() {
  const secret = getSecret();
  if (!secret) throw new Error('ADMIN_SESSION_SECRET이 설정되지 않았습니다.');

  const payload = Buffer.from(
    JSON.stringify({
      admin: true,
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    })
  ).toString('base64url');

  return `${payload}.${sign(payload, secret)}`;
}

export function verifyAdminToken(token) {
  const secret = getSecret();
  if (!secret || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  const expected = sign(payload, secret);

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );

    return data.admin === true &&
      Number.isInteger(data.exp) &&
      data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_SESSION_SECONDS = SESSION_SECONDS;
