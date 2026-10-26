import { assert } from '../validation';

import type { StudioEnv } from './runtime';

const encoder = new TextEncoder();
const encryptionKey = async (secret: string, owner: string): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode('tilawa-buffer-v1'),
      info: encoder.encode(owner),
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
};
const encode = (bytes: Uint8Array): string => btoa(String.fromCharCode(...Array.from(bytes)));
const decode = (value: string): Uint8Array => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export const encryptPublisherToken = async (
  secret: string,
  owner: string,
  token: string,
): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode(owner) },
    await encryptionKey(secret, owner),
    encoder.encode(token),
  );
  return `1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
};
export const decryptPublisherToken = async (
  secret: string,
  owner: string,
  stored: string,
): Promise<string> => {
  try {
    const [version, iv, encrypted] = stored.split('.');
    assert(version === '1', 'BUFFER_RECONNECT', 409);
    const clear = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: decode(iv), additionalData: encoder.encode(owner) },
      await encryptionKey(secret, owner),
      decode(encrypted),
    );
    return new TextDecoder().decode(clear);
  } catch {
    assert(false, 'BUFFER_RECONNECT', 409);
    return '';
  }
};
export const publisherToken = async (
  env: StudioEnv,
  owner: string,
  stored: string,
): Promise<string> => {
  if (stored === 'worker-secret:v1') {
    assert(env.STUDIO_BUFFER_TOKEN, 'BUFFER_RECONNECT', 409);
    return env.STUDIO_BUFFER_TOKEN;
  }
  return decryptPublisherToken(env.STUDIO_SIGNING_SECRET, owner, stored);
};
