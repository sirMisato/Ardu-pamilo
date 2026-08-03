import { pbkdf2Sync, timingSafeEqual } from "node:crypto";

const iterations = 120_000;
const keyLength = 32;
const digest = "sha256";

export function hashPassword(password: string, salt: string): string {
  const derived = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("base64url");
  return `pbkdf2_${digest}$${iterations}$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, iterationText, salt, expectedHash] = storedHash.split("$");

  if (algorithm !== `pbkdf2_${digest}` || !iterationText || !salt || !expectedHash) {
    return false;
  }

  const parsedIterations = Number(iterationText);
  if (!Number.isInteger(parsedIterations) || parsedIterations <= 0) {
    return false;
  }

  const actual = pbkdf2Sync(password, salt, parsedIterations, keyLength, digest);
  const expected = Buffer.from(expectedHash, "base64url");

  if (actual.byteLength !== expected.byteLength) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
