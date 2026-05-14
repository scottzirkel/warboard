import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { getPrisma } from './db';

// Lazy adapter: defers getPrisma() call until first auth operation,
// since getCloudflareContext() is only available during request handling
// All adapter methods PrismaAdapter implements — declared statically so
// Auth.js validation passes at module load without triggering getCloudflareContext()
const ADAPTER_METHODS = new Set([
  'createUser', 'getUser', 'getUserByEmail', 'getUserByAccount', 'updateUser',
  'deleteUser', 'linkAccount', 'unlinkAccount', 'createSession',
  'getSessionAndUser', 'updateSession', 'deleteSession',
  'createVerificationToken', 'useVerificationToken',
]);

function createLazyAdapter() {
  let adapter: ReturnType<typeof PrismaAdapter> | null = null;

  function ensureAdapter() {
    if (!adapter) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapter = PrismaAdapter(getPrisma() as any);
    }
    return adapter;
  }

  return new Proxy({} as ReturnType<typeof PrismaAdapter>, {
    get(_, prop) {
      // Return a lazy wrapper for known methods (defers Prisma init to call time)
      if (typeof prop === 'string' && ADAPTER_METHODS.has(prop)) {
        return (...args: unknown[]) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ensureAdapter() as Record<string, (...a: any[]) => any>)[prop](...args);
      }
      return undefined;
    },
    has(_, prop) {
      return typeof prop === 'string' && ADAPTER_METHODS.has(prop);
    },
    ownKeys() {
      return [...ADAPTER_METHODS];
    },
    getOwnPropertyDescriptor(_, prop) {
      if (typeof prop === 'string' && ADAPTER_METHODS.has(prop)) {
        return { configurable: true, enumerable: true, writable: true, value: () => {} };
      }
      return undefined;
    },
  });
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: createLazyAdapter(),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
      // Disable issuer check — Google doesn't include "iss" in the callback response
      checks: ['pkce', 'state'],
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
