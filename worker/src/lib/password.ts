const PBKDF2_PREFIX = "pbkdf2-sha256";
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH_BITS = 256;

function toHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error("Invalid hex string");
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

async function derivePasswordKey(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    PBKDF2_KEY_LENGTH_BITS
  );

  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derivePasswordKey(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}:${PBKDF2_ITERATIONS}:${toHex(salt)}:${toHex(key)}`;
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [prefix, iterationsValue, saltValue, keyValue, extra] = hash.split(":");

  if (prefix !== PBKDF2_PREFIX || !iterationsValue || !saltValue || !keyValue || extra !== undefined) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!/^\d+$/.test(iterationsValue) || !Number.isSafeInteger(iterations) || iterations <= 0 || iterations > PBKDF2_ITERATIONS ||
      !/^[0-9a-f]{32}$/i.test(saltValue) || !/^[0-9a-f]{64}$/i.test(keyValue)) {
    return false;
  }

  const expected = fromHex(keyValue);
  const actual = await derivePasswordKey(password, fromHex(saltValue), iterations);

  if (actual.length !== expected.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < actual.length; index++) {
    diff |= (actual[index] ?? 0) ^ (expected[index] ?? 0);
  }

  return diff === 0;
}
