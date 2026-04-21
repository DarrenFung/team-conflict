import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuthTypes,
  Connector,
  IpAddressTypes,
} from '@google-cloud/cloud-sql-connector';

declare global {
  var __prisma: PrismaClient | undefined;
}

async function createPrisma(): Promise<PrismaClient> {
  const instance = process.env.CLOUD_SQL_INSTANCE_CONNECTION_NAME;

  if (instance) {
    const iamUser = process.env.CLOUD_SQL_IAM_USER;
    const database = process.env.CLOUD_SQL_DATABASE;
    if (!iamUser || !database) {
      throw new Error(
        'CLOUD_SQL_IAM_USER and CLOUD_SQL_DATABASE are required when CLOUD_SQL_INSTANCE_CONNECTION_NAME is set',
      );
    }

    const connector = new Connector();
    try {
      const clientOpts = await connector.getOptions({
        instanceConnectionName: instance,
        ipType: IpAddressTypes.PUBLIC,
        authType: AuthTypes.IAM,
      });

      // Each Vercel lambda keeps its own pool. Without an external pooler
      // (PgBouncer / Cloud SQL Auth Proxy), keep this small — N lambdas × max
      // connections can exceed Cloud SQL's per-instance limit.
      const adapter = new PrismaPg({
        ...clientOpts,
        user: iamUser,
        database,
        max: 1,
      });
      return new PrismaClient({ adapter });
    } catch (err) {
      // If adapter/client construction fails, stop the connector's background
      // token-refresh timers so we don't leak them.
      connector.close();
      throw err;
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is required for local development');
  }

  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? (globalThis.__prisma = await createPrisma());
