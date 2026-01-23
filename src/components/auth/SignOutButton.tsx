'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/Button';

interface SignOutButtonProps {
  className?: string;
}

/**
 * Button to sign out the current user
 * Uses NextAuth's signOut function
 */
export function SignOutButton({ className = '' }: SignOutButtonProps) {
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="ghost"
      size="sm"
      className={className}
    >
      Sign out
    </Button>
  );
}
