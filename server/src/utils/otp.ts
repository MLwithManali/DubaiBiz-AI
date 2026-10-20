
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export function generateOtp(): string {
  return randomInt(0, 1_000_000)
    .toString()
    .padStart(6, "0");
}

function otpDigest(userId: number, otp: string): Buffer {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET must contain at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(`${userId}:${otp}`)
    .digest();
}

export function hashOtp(userId: number, otp: string): string {
  return otpDigest(userId, otp).toString("hex");
}

export function verifyOtpHash(
  userId: number,
  otp: string,
  storedHash: string
): boolean {
  if (!/^\d{6}$/.test(otp)) return false;

  const actual = otpDigest(userId, otp);
  const expected = Buffer.from(storedHash, "hex");

  return (
    actual.length === expected.length &&
    timingSafeEqual(actual, expected)
  );
}
