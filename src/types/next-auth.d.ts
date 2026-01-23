import { DefaultSession } from 'next-auth';

/**
 * Extend NextAuth types to include user ID in session
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}
