import { scryptSync, timingSafeEqual, randomBytes } from 'node:crypto';
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password,salt,64).toString('hex')}`;
}
export function checkPassword(password, hash) {
  if (!hash || typeof password !== 'string' || password.length > 256) return false;
  const [scheme,salt,encoded] = hash.split(':');
  if (scheme !== 'scrypt' || !salt || !encoded) return false;
  const expected = Buffer.from(encoded,'hex');
  const actual = scryptSync(password,salt,64);
  return actual.length === expected.length && timingSafeEqual(actual,expected);
}
