/// <reference lib="webworker" />

export type HashAlgorithm = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

export interface HashRequest {
  id: string;
  data: ArrayBuffer | string;
  algorithm: HashAlgorithm;
  inputType: 'text' | 'file';
}

export interface HashResponse {
  id: string;
  hash?: string;
  error?: string;
}

addEventListener('message', async ({ data }: { data: HashRequest }) => {
  try {
    let hash = '';
    let buffer: ArrayBuffer;

    if (typeof data.data === 'string') {
      const encoder = new TextEncoder();
      buffer = encoder.encode(data.data).buffer as ArrayBuffer;
    } else {
      buffer = data.data;
    }

    if (data.algorithm === 'MD5') {
      hash = md5(new Uint8Array(buffer));
    } else {
      const hashBuffer = await crypto.subtle.digest(data.algorithm, buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }

    postMessage({ id: data.id, hash } as HashResponse);
  } catch (error) {
    postMessage({ id: data.id, error: String(error) } as HashResponse);
  }
});

// MD5 implementation
function md5(data: Uint8Array): string {
  const K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ]);

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9,
    14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const rotateLeft = (x: number, n: number) => (x << n) | (x >>> (32 - n));

  // Padding
  const originalLength = data.length;
  const bitLength = originalLength * 8;
  const paddingLength = ((56 - ((originalLength + 1) % 64) + 64) % 64) + 1;
  const padded = new Uint8Array(originalLength + paddingLength + 8);
  padded.set(data);
  padded[originalLength] = 0x80;

  // Add length in bits as 64-bit little-endian
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, bitLength >>> 0, true);
  view.setUint32(padded.length - 4, Math.floor(bitLength / 0x100000000), true);

  // Initialize hash values
  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  // Process each 64-byte chunk
  for (let i = 0; i < padded.length; i += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(i + j * 4, true);
    }

    let A = a0,
      B = b0,
      C = c0,
      D = d0;

    for (let j = 0; j < 64; j++) {
      let F: number, g: number;
      if (j < 16) {
        F = (B & C) | (~B & D);
        g = j;
      } else if (j < 32) {
        F = (D & B) | (~D & C);
        g = (5 * j + 1) % 16;
      } else if (j < 48) {
        F = B ^ C ^ D;
        g = (3 * j + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * j) % 16;
      }

      F = (F + A + K[j] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotateLeft(F, S[j])) >>> 0;
    }

    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  // Convert to hex string (little-endian)
  const toHex = (n: number) => {
    const bytes = new Uint8Array(4);
    new DataView(bytes.buffer).setUint32(0, n, true);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  return toHex(a0) + toHex(b0) + toHex(c0) + toHex(d0);
}
