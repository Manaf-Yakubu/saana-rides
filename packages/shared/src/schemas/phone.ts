import { z } from 'zod';

const GHANA_PHONE = /^(?:\+233|233|0)([2-5]\d{8})$/;

/** Normalises Ghanaian numbers (`024...`, `23324...`, `+23324...`) to E.164 `+233XXXXXXXXX`. */
export function normalizeGhanaPhone(input: string): string | null {
  const match = GHANA_PHONE.exec(input.replace(/[\s-]/g, ''));
  return match ? `+233${match[1]}` : null;
}

export const ghanaPhoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeGhanaPhone(value);
  if (!normalized) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid Ghana phone number' });
    return z.NEVER;
  }
  return normalized;
});
