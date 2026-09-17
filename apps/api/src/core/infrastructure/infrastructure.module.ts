import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import { Pool } from 'pg';

@Global()
@Module({
  providers: [
    {
      provide: 'POSTGRES_POOL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString: config.get('DATABASE_URL', 'postgresql://customer360:customer360_dev@localhost:5432/customer360'),
        }),
    },
    {
      provide: 'MONGO_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new MongoClient(config.get('MONGODB_URL', 'mongodb://localhost:27017')),
    },
  ],
  exports: ['POSTGRES_POOL', 'MONGO_CLIENT'],
})
export class InfrastructureModule implements OnModuleDestroy {
  constructor(
    @Inject('POSTGRES_POOL') private readonly pool: Pool,
    @Inject('MONGO_CLIENT') private readonly mongo: MongoClient,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    await this.mongo.close();
  }
}
