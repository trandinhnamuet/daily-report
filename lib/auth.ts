import { createHmac, timingSafeEqual } from 'crypto';

export const AUTH_COOKIE = 'app_auth';

// 1 năm: cookie httpOnly sống lâu hơn localStorage nhiều (Safari/iOS xoá
// script-writable storage sau ~7 ngày không dùng), nên đỡ phải nhập lại pass.
export const AUTH_MAX_AGE = 60 * 60 * 24 * 365;

export function getExpectedPassword(): string | undefined {
  const value = process.env.APP_PASSWORD;
  return value ? value : undefined;
}

// Token bám theo mật khẩu hiện tại: đổi APP_PASSWORD → mọi cookie cũ tự hết hiệu lực.
export function makeToken(expected: string): string {
  return createHmac('sha256', expected).update('app-auth-v1').digest('hex');
}

export function isValidToken(token: string | undefined, expected: string): boolean {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(makeToken(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidPassword(password: unknown, expected: string): boolean {
  if (typeof password !== 'string') return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
