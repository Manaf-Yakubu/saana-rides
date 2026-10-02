import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'auth:isPublic';

/** Opts a route out of authentication. Use only for login, health and webhooks. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
