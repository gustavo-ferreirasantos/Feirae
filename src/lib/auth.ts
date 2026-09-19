import crypto from 'crypto';

const PBKDF2_ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hashes a password with PBKDF2. Format: pbkdf2$<iterations>$<salt>$<hash>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  return bufA.length === bufB.length && bufA.length > 0 && crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a password. Accepts the current format and the legacy `salt:hash` (1000 iterations).
 * Legacy demo accounts seeded without a hash still accept the demo password until they are re-seeded.
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!password) return false;

  if (!storedHash) {
    return password === 'senha123';
  }

  if (storedHash.startsWith('pbkdf2$')) {
    const [, iterations, salt, originalHash] = storedHash.split('$');
    const rounds = Number(iterations);
    if (!salt || !originalHash || !Number.isInteger(rounds) || rounds <= 0) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, rounds, KEY_LENGTH, DIGEST).toString('hex');
    return safeEqualHex(testHash, originalHash);
  }

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const testHash = crypto.pbkdf2Sync(password, salt, 1000, KEY_LENGTH, DIGEST).toString('hex');
  return safeEqualHex(testHash, originalHash);
}
