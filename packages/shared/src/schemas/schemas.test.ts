import { describe, expect, it } from 'vitest';
import {
  mfaVerifySchema,
  normalizeGhanaPhone,
  otpRequestSchema,
  passwordLoginSchema,
} from './index';

describe('normalizeGhanaPhone', () => {
  it.each([
    ['0244123456', '+233244123456'],
    ['024 412 3456', '+233244123456'],
    ['233554123456', '+233554123456'],
    ['+233204123456', '+233204123456'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeGhanaPhone(input)).toBe(expected);
  });

  it.each(['024412345', '+2341234567890', '0144123456', 'abc'])('rejects %s', (input) => {
    expect(normalizeGhanaPhone(input)).toBeNull();
  });
});

describe('auth schemas', () => {
  it('normalises phone in OTP requests', () => {
    expect(otpRequestSchema.parse({ phone: '0244123456' })).toEqual({ phone: '+233244123456' });
    expect(otpRequestSchema.safeParse({ phone: '123' }).success).toBe(false);
  });

  it('rejects unknown fields', () => {
    expect(
      passwordLoginSchema.safeParse({ identifier: 'a@b.com', password: 'x', role: 'MANAGEMENT' })
        .success,
    ).toBe(false);
  });

  it('requires six-digit codes', () => {
    expect(mfaVerifySchema.safeParse({ mfaToken: 't', code: '12345' }).success).toBe(false);
    expect(mfaVerifySchema.safeParse({ mfaToken: 't', code: '123456' }).success).toBe(true);
  });
});
