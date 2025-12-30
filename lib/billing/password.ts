import crypto from 'crypto';

export function generateStrongPassword(length = 16) {
  const bytes = crypto.randomBytes(Math.ceil(length * 0.75));
  return bytes
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, length);
}
