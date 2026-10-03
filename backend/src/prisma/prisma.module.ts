import { Global, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        user: config.get<string>('database.user'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
      }),
    });
  }

  onModuleDestroy() {
    return this.$disconnect();
  }
}

// Código do erro original do PostgreSQL (ex.: 23505, 40001), que o Prisma embrulha.
export function pgErrorCode(error: unknown): string | undefined {
  const e = error as {
    code?: string;
    cause?: { originalCode?: string };
    meta?: { driverAdapterError?: { cause?: { originalCode?: string } } };
  };
  return e?.meta?.driverAdapterError?.cause?.originalCode ?? e?.cause?.originalCode ?? e?.code;
}

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
