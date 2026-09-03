import crypto from 'crypto';

/**
 * Generates a secure salt and hashes password with PBKDF2
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against the stored salt:hash string
 */
export function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) {
    // If no password set yet (e.g. legacy demo seed), allow demo password 'senha123'
    return password === 'senha123';
  }

  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;

  const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return testHash === originalHash;
}
