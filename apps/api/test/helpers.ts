import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { StaffType, UserRole } from '@saana/shared';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/infra/prisma/prisma.service';
import { SMS_PROVIDER, type SmsProvider } from '../src/infra/sms/sms.provider';
import { Authorize } from '../src/modules/auth/decorators/authorize.decorator';
import { PasswordService } from '../src/modules/auth/password.service';
import { TokenService } from '../src/modules/auth/token.service';

export class FakeSms implements SmsProvider {
  readonly sent: { to: string; message: string }[] = [];
  async send(to: string, message: string): Promise<void> {
    this.sent.push({ to, message });
  }
  lastCodeFor(phone: string): string | undefined {
    const msg = [...this.sent].reverse().find((m) => m.to === phone)?.message;
    return msg ? /\b(\d{6})\b/.exec(msg)?.[1] : undefined;
  }
}

/** Routes used only to prove policy enforcement end to end. */
@Controller('test-rbac')
export class RbacProbeController {
  @Get('no-policy')
  noPolicy() {
    return { ok: true };
  }

  @Authorize({ roles: ['MANAGEMENT'] })
  @Get('management')
  management() {
    return { ok: true };
  }

  @Authorize({ roles: ['MANAGEMENT', 'STAFF'], staffTypes: ['FINANCE'] })
  @Get('finance')
  finance() {
    return { ok: true };
  }

  @Authorize({ roles: ['DRIVER'] })
  @Get('driver')
  driver() {
    return { ok: true };
  }
}

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
  sms: FakeSms;
  passwords: PasswordService;
  tokens: TokenService;
}

export async function createTestApp(): Promise<TestApp> {
  const sms = new FakeSms();
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [RbacProbeController],
  })
    .overrideProvider(SMS_PROVIDER)
    .useValue(sms)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app, { CORS_ORIGINS: [] });
  await app.init();
  return {
    app,
    prisma: app.get(PrismaService),
    sms,
    passwords: app.get(PasswordService),
    tokens: app.get(TokenService),
  };
}

let phoneSeq = 0;
export function uniquePhone(): string {
  phoneSeq += 1;
  return `+23324${String(Date.now() % 10_000).padStart(4, '0')}${String(phoneSeq).padStart(3, '0')}`;
}

export async function createUser(
  t: TestApp,
  opts: { role: UserRole; staffTypes?: StaffType[]; password?: string; email?: string },
) {
  const phone = uniquePhone();
  return t.prisma.user.create({
    data: {
      phone,
      email: opts.email ?? null,
      role: opts.role,
      passwordHash: opts.password ? await t.passwords.hash(opts.password) : null,
      ...(opts.role === 'MANAGEMENT' || opts.role === 'STAFF'
        ? { staffProfile: { create: { fullName: 'Test User', staffTypes: opts.staffTypes ?? [] } } }
        : {}),
    },
  });
}
