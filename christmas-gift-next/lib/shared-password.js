import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const scrypt = promisify(scryptCallback);

// Keep the original gift-site format so existing scrypt accounts remain valid.
export async function hashSharedPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(String(password), salt, 64);
  return `${salt}:${Buffer.from(derivedKey).toString('hex')}`;
}

// Supports the original gift-site scrypt hashes and the first Mari prototype's bcrypt hashes.
export async function verifySharedPassword(password, passwordHash) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') return false;

  if (/^\$2[aby]\$/.test(passwordHash)) {
    try { return await bcrypt.compare(password, passwordHash); }
    catch { return false; }
  }

  const [salt, savedHash, extra] = passwordHash.split(':');
  if (extra !== undefined || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(savedHash || '')) {
    return false;
  }

  try {
    const derivedKey = Buffer.from(await scrypt(password, salt, 64));
    const expectedHash = Buffer.from(savedHash, 'hex');
    return derivedKey.length === expectedHash.length && timingSafeEqual(derivedKey, expectedHash);
  } catch {
    return false;
  }
}
