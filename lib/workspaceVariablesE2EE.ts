 'use client';

type MeResponse = {
  data?: {
    userId: string;
  };
};

function toBase64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function fromBase64(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function getCurrentUserId(): Promise<string> {
  const res = await fetch('/api/me', { method: 'GET' });
  if (!res.ok) {
    throw new Error('Unauthorized');
  }
  const json = (await res.json()) as MeResponse;
  const userId = json?.data?.userId;
  if (!userId) {
    throw new Error('Unauthorized');
  }
  return userId;
}

async function getOrCreateKey(userId: string): Promise<CryptoKey> {
  const storageKey = `taskman.workspaceVariables.e2ee.v1.key.${userId}`;

  const existing = (() => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return null;
    }
  })();

  if (existing) {
    const raw = fromBase64(existing);
    return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }

  const raw = crypto.getRandomValues(new Uint8Array(32));
  try {
    window.localStorage.setItem(storageKey, toBase64(raw));
  } catch {
    throw new Error('Unable to store encryption key');
  }

  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptWorkspaceVariableValue(plainText: string): Promise<string> {
  const userId = await getCurrentUserId();
  const key = await getOrCreateKey(userId);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  const cipherBytes = new Uint8Array(cipherBuf);
  return `e2ee:v1:${toBase64(iv)}:${toBase64(cipherBytes)}`;
}

export async function decryptWorkspaceVariableValue(cipherText: string): Promise<string> {
  const raw = String(cipherText ?? '');
  if (!raw.startsWith('e2ee:v1:')) {
    return raw;
  }

  const parts = raw.split(':');
  if (parts.length !== 4) {
    return raw;
  }

  const userId = await getCurrentUserId();
  const key = await getOrCreateKey(userId);

  const iv = fromBase64(parts[2]!);
  const data = fromBase64(parts[3]!);

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plainBuf);
}
