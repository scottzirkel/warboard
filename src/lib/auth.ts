import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './db';
import type { Adapter } from 'next-auth/adapters';

/**
 * NextAuth.js configuration for Army Tracker
 *
 * Uses Google OAuth for authentication with Prisma adapter for session storage.
 * The adapter stores users, accounts, and sessions in the database.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    /**
     * Add user id to session for client-side access
     */
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    // Use default NextAuth pages for now
    // Can customize later if needed
  },
};
