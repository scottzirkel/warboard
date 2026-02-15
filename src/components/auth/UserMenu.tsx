'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { SignInButton } from './SignInButton';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className = '' }: UserMenuProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (status === 'loading') {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="h-7 w-7 rounded-full bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className={className}>
        <SignInButton />
      </div>
    );
  }

  return (
    <div className={`relative z-[60] ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center rounded-full transition-opacity hover:opacity-80"
        title={session.user?.name || session.user?.email || 'Account'}
      >
        {session.user?.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User avatar'}
            width={28}
            height={28}
            className="rounded-full bg-white border-2 border-white"
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/70">
            {session.user?.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 material-elevated rounded-xl shadow-xl border border-white/10 overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-white/10">
            <p className="text-sm font-medium text-white truncate">
              {session.user?.name}
            </p>
            <p className="text-xs text-white/40 truncate">
              {session.user?.email}
            </p>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              signOut({ callbackUrl: '/' });
            }}
            className="w-full px-3 py-2.5 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
