const encoder = new TextEncoder();
export const sha256 = async (value: string): Promise<string> =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
const key = (secret: string): Promise<CryptoKey> =>
  crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
export const sign = async (secret: string, value: string): Promise<string> =>
  Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(value))),
    (b) => b.toString(16).padStart(2, '0'),
  ).join('');
export const verify = async (
  secret: string,
  value: string,
  signature: string,
): Promise<boolean> => {
  if (!/^[0-9a-f]{64}$/.test(signature)) return false;
  const bytes = new Uint8Array(signature.match(/../g).map((x) => parseInt(x, 16)));
  return crypto.subtle.verify('HMAC', await key(secret), bytes, encoder.encode(value));
};
export const capability = async (
  secret: string,
  resource: string,
  expires: number,
): Promise<string> => `${expires}.${await sign(secret, `${resource}:${expires}`)}`;
export const validCapability = async (
  secret: string,
  resource: string,
  token: string,
): Promise<boolean> => {
  const match = /^(\d{13})\.([0-9a-f]{64})$/.exec(token);
  if (!match) return false;
  const [, expires, signature] = match;
  return (
    Number(expires) > Date.now() &&
    // Allow small clock differences between Worker locations for freshly renewed guest cookies.
    Number(expires) <= Date.now() + 86400000 + 60000 &&
    verify(secret, `${resource}:${expires}`, signature ?? '')
  );
};
