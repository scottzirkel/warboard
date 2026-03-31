'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useUIStore } from '@/stores/uiStore';

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
        <div className="absolute right-0 top-full mt-1 w-52 bg-cm-menu-bg backdrop-blur-xl border border-cm-border-input rounded-xl shadow-xl overflow-hidden">
          {/* User info (if signed in) */}
          {session?.user && (
            <div className="px-3 py-2.5 border-b border-cm-border-input flex items-center gap-2">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-cm-surface-hover flex items-center justify-center text-xs font-medium text-cm-text-secondary">
                  {session.user.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-cm-text truncate">{session.user.name}</p>
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
          <div className="border-t border-cm-border-input" />

          {/* Auth */}
          <div className="py-1">
            {status === 'loading' ? (
              <div className="px-3 py-2 text-sm text-cm-text-faint">Loading...</div>
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
          <div className="border-t border-cm-border-input" />

          {/* Color Mode */}
          <div className="py-1">
            <ColorModeToggle onClose={() => setIsOpen(false)} />
          </div>

          {/* Divider */}
          <div className="border-t border-cm-border-input" />

          {/* Start Over */}
          <div className="py-1">
            <MenuItem label="Start Over" onClick={() => handleAction(onStartOver)} variant="danger" />
          </div>
        </div>
      )}
    </div>
  );
}

function ColorModeToggle({ onClose }: { onClose: () => void }) {
  const colorMode = useUIStore((state) => state.colorMode);
  const toggleColorMode = useUIStore((state) => state.toggleColorMode);

  return (
    <button
      onClick={() => {
        toggleColorMode();
        onClose();
      }}
      className="w-full px-3 py-2 text-left text-sm text-cm-text hover:bg-cm-surface-hover transition-colors flex items-center justify-between"
    >
      <span>{colorMode === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 text-cm-text-secondary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        {colorMode === 'dark' ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        )}
      </svg>
    </button>
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
          ? 'text-cm-text-faint cursor-not-allowed'
          : variant === 'danger'
            ? 'text-red-400 hover:bg-red-500/20'
            : 'text-cm-text hover:bg-cm-surface-hover'
        }
      `}
    >
      {label}
    </button>
  );
}
