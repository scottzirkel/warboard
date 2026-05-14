import { PrismaClient } from '@/generated/prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Cache PrismaClient per D1 binding instance to avoid creating
// multiple clients within the same request
const clientCache = new WeakMap<object, PrismaClient>();

export function getPrisma(): PrismaClient {
  const { env } = getCloudflareContext();

  const cached = clientCache.get(env.DB);
  if (cached) return cached;

  const adapter = new PrismaD1(env.DB);
  const client = new PrismaClient({ adapter });
  clientCache.set(env.DB, client);

  return client;
}

export default getPrisma;
