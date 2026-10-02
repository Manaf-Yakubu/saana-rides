import { Injectable, Logger } from '@nestjs/common';
import type { SmsProvider } from './sms.provider';

/** Development adapter: writes messages to the log instead of sending them. */
@Injectable()
export class LogSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SMS');

  async send(to: string, message: string): Promise<void> {
    this.logger.log(`to=${to} message=${message}`);
  }
}
