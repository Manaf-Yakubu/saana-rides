/**
 * Bootstraps a Management user. The password is read from ADMIN_PASSWORD so it never lands in
 * shell history; TOTP enrolment is forced at first login.
 *
 *   ADMIN_PASSWORD='...' pnpm --filter @saana/api cli:create-admin -- --phone 0244000000 \
 *     --email admin@saana.example --name "Ama Mensah"
 */
import { PrismaClient } from '@prisma/client';
import { normalizeGhanaPhone, passwordSchema } from '@saana/shared';
import { parseArgs } from 'node:util';
import { PasswordService } from '../modules/auth/password.service';

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      phone: { type: 'string' },
      email: { type: 'string' },
      name: { type: 'string' },
    },
  });
  const phone = normalizeGhanaPhone(values.phone ?? '');
  if (!phone) throw new Error('--phone must be a valid Ghana phone number');
  if (!values.email?.includes('@')) throw new Error('--email is required');
  if (!values.name?.trim()) throw new Error('--name is required');
  const password = passwordSchema.parse(process.env.ADMIN_PASSWORD ?? '');

  const prisma = new PrismaClient();
  try {
    const passwordHash = await new PasswordService().hash(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          phone,
          email: values.email!.toLowerCase(),
          passwordHash,
          role: 'MANAGEMENT',
          staffProfile: { create: { fullName: values.name!.trim(), staffTypes: [] } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: 'user.created',
          entity: 'user',
          entityId: created.id,
          after: { role: 'MANAGEMENT', phone, email: created.email, via: 'cli:create-admin' },
        },
      });
      return created;
    });
    console.log(`Created MANAGEMENT user ${user.id}. Enrol TOTP at first login.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
