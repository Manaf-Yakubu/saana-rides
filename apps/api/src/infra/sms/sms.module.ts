import { Global, Module } from '@nestjs/common';
import { LogSmsProvider } from './log-sms.provider';
import { SMS_PROVIDER } from './sms.provider';

@Global()
@Module({
  providers: [{ provide: SMS_PROVIDER, useClass: LogSmsProvider }],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
