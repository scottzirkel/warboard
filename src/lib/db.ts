// Database client singleton for Prisma
//
// This module is only available after running `prisma generate`.
// See prisma/schema.prisma for the database schema.
//
// Usage:
//   import { prisma } from '@/lib/db';
//   const users = await prisma.user.findMany();
//
// Before first use:
//   npm run db:generate  # Generate Prisma client
//   npm run db:push      # Create database tables

// Dynamically import Prisma to avoid build errors when client isn't generated
let prisma: import('@prisma/client').PrismaClient;

const { PrismaClient } = require('@prisma/client'); // eslint-disable-line

const globalForPrisma = globalThis as unknown as {
  prisma: import('@prisma/client').PrismaClient | undefined;
};

prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma };
export default prisma;
