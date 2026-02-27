'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';

interface NavMenuProps {
  onSave: () => void;
  onLoad: () => void;
  onImport: () => void;
  onExport: () => void;
  onClear: () => void;
  onStartOver: () => void;
  canExport?: boolean;
  canClear?: boolean;
}

export function NavMenu({
  onSave,
  onLoad,
  onImport,
  onExport,
  onClear,
  onStartOver,
  canExport = false,
  canClear = false,
}: NavMenuProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
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

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative z-[60]" ref={menuRef}>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ios btn-ios-sm btn-ios-tinted"
        title="Menu"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-zinc-800/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl overflow-hidden">
          {/* User info (if signed in) */}
          {session?.user && (
            <div className="px-3 py-2.5 border-b border-white/10 flex items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium text-white/70">
                  {session.user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
              </div>
            </div>
          )}

          {/* List Actions */}
          <div className="py-1">
            <MenuItem label="Save" onClick={() => handleAction(onSave)} />
            <MenuItem label="Load List" onClick={() => handleAction(onLoad)} />
            <MenuItem label="Import" onClick={() => handleAction(onImport)} />
            <MenuItem label="Export" onClick={() => handleAction(onExport)} disabled={!canExport} />
            <MenuItem label="Clear List" onClick={() => handleAction(onClear)} disabled={!canClear} variant="danger" />
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Auth */}
          <div className="py-1">
            {status === 'loading' ? (
              <div className="px-3 py-2 text-sm text-white/30">Loading...</div>
            ) : session ? (
              <MenuItem
                label="Sign out"
                onClick={() => {
                  setIsOpen(false);
                  signOut({ callbackUrl: '/' });
                }}
              />
            ) : (
              <MenuItem
                label="Sign in with Google"
                onClick={() => {
                  setIsOpen(false);
                  signIn('google', { callbackUrl: '/' });
                }}
              />
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10" />

          {/* Start Over */}
          <div className="py-1">
            <MenuItem label="Start Over" onClick={() => handleAction(onStartOver)} variant="danger" />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  disabled = false,
  variant = 'default',
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        w-full px-3 py-2 text-left text-sm transition-colors
        ${disabled
          ? 'text-white/30 cursor-not-allowed'
          : variant === 'danger'
            ? 'text-red-400 hover:bg-red-500/20'
            : 'text-white/90 hover:bg-white/10'
        }
      `}
    >
      {label}
    </button>
  );
}
