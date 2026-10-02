import { z } from 'zod';
import { StaffType, UserRole } from '../enums';
import { ghanaPhoneSchema } from './phone';

export const PASSWORD_MIN_LENGTH = 12;

const otpCode = z.string().regex(/^\d{6}$/, 'Code must be 6 digits');

export const passwordLoginSchema = z
  .object({
    identifier: z.string().trim().min(3).max(254),
    password: z.string().min(1).max(256),
  })
  .strict();
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;

export const mfaEnrollSchema = z.object({ mfaToken: z.string().min(1) }).strict();
export type MfaEnrollInput = z.infer<typeof mfaEnrollSchema>;

export const mfaVerifySchema = z.object({ mfaToken: z.string().min(1), code: otpCode }).strict();
export type MfaVerifyInput = z.infer<typeof mfaVerifySchema>;

export const otpRequestSchema = z.object({ phone: ghanaPhoneSchema }).strict();
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({ phone: ghanaPhoneSchema, code: otpCode }).strict();
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1).max(512) }).strict();
export type RefreshInput = z.infer<typeof refreshSchema>;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(256);

export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  role: UserRole;
  staffTypes: StaffType[];
}

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  user: AuthUser;
}

export type PasswordLoginResult =
  | { status: 'MFA_REQUIRED'; mfaToken: string }
  | { status: 'MFA_ENROLLMENT_REQUIRED'; mfaToken: string };

export interface MfaEnrollment {
  secret: string;
  otpauthUri: string;
}
