'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';

interface UserMenuProps {
  className?: string;
}

/**
 * User menu component that shows auth state
 * Displays sign in button for unauthenticated users
 * Displays user info and sign out for authenticated users
 */
export function UserMenu({ className = '' }: UserMenuProps) {
  const { data: session, status } = useSession();

  // Loading state
  if (status === 'loading') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="h-8 w-8 rounded-full bg-gray-700 animate-pulse" />
      </div>
    );
  }

  // Unauthenticated state
  if (!session) {
    return (
      <div className={className}>
        <SignInButton />
      </div>
    );
  }

  // Authenticated state
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {session.user?.image ? (
        <Image
          src={session.user.image}
          alt={session.user.name || 'User avatar'}
          width={32}
          height={32}
          className="rounded-full border border-gray-600"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium">
          {session.user?.name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
      <span className="text-sm text-gray-300 hidden sm:inline">
        {session.user?.name || session.user?.email}
      </span>
      <SignOutButton />
    </div>
  );
}
