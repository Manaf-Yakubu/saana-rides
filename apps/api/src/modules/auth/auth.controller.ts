import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  mfaEnrollSchema,
  mfaVerifySchema,
  otpRequestSchema,
  otpVerifySchema,
  passwordLoginSchema,
  refreshSchema,
  type AuthTokens,
  type AuthUser,
  type MfaEnrollInput,
  type MfaEnrollment,
  type MfaVerifyInput,
  type OtpRequestInput,
  type OtpVerifyInput,
  type PasswordLoginInput,
  type PasswordLoginResult,
  type RefreshInput,
} from '@saana/shared';
import { ReqMeta, type RequestMeta } from '../../common/request-meta';
import { ZodValidationPipe } from '../../common/zod-validation.pipe';
import { AuthService } from './auth.service';
import { ANY_ROLE, Authorize } from './decorators/authorize.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import type { Principal } from './principal';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body(new ZodValidationPipe(passwordLoginSchema)) body: PasswordLoginInput,
    @ReqMeta() meta: RequestMeta,
  ): Promise<PasswordLoginResult> {
    return this.auth.loginWithPassword(body.identifier, body.password, meta);
  }

  @Public()
  @Post('mfa/enroll')
  @HttpCode(HttpStatus.OK)
  enrollMfa(
    @Body(new ZodValidationPipe(mfaEnrollSchema)) body: MfaEnrollInput,
  ): Promise<MfaEnrollment> {
    return this.auth.enrollMfa(body.mfaToken);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  verifyMfa(
    @Body(new ZodValidationPipe(mfaVerifySchema)) body: MfaVerifyInput,
    @ReqMeta() meta: RequestMeta,
  ): Promise<AuthTokens> {
    return this.auth.verifyMfa(body.mfaToken, body.code, meta);
  }

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestOtp(
    @Body(new ZodValidationPipe(otpRequestSchema)) body: OtpRequestInput,
  ): Promise<void> {
    await this.auth.requestOtp(body.phone);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Body(new ZodValidationPipe(otpVerifySchema)) body: OtpVerifyInput,
    @ReqMeta() meta: RequestMeta,
  ): Promise<AuthTokens> {
    return this.auth.verifyOtp(body.phone, body.code, meta);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @ReqMeta() meta: RequestMeta,
  ): Promise<AuthTokens> {
    return this.auth.refresh(body.refreshToken, meta);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @ReqMeta() meta: RequestMeta,
  ): Promise<void> {
    return this.auth.logout(body.refreshToken, meta);
  }

  @ApiBearerAuth()
  @Authorize(ANY_ROLE)
  @Get('me')
  me(@CurrentUser() principal: Principal): Promise<AuthUser> {
    return this.auth.me(principal);
  }
}
