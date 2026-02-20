import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;
  // Config log query (Opsional: bagus untuk debugging)
  constructor() {
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    super({
      adapter,
      log: ['info', 'warn', 'error'], // Lihat query apa yang dijalankan (kecuali 'query' yang bikin spam)
    });
  }

  async onModuleInit() {
    // Saat aplikasi nyala, connect ke DB
    await this.$connect();
  }

  async onModuleDestroy() {
    // Saat aplikasi mati, putus koneksi biar tidak memory leak
    await this.$disconnect();
    await this.pool.end();
  }
}
