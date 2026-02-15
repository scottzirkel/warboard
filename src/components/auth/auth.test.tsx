import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SignInButton } from './SignInButton';
import { SignOutButton } from './SignOutButton';
import { UserMenu } from './UserMenu';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}));

// Import mocked functions for assertions
import { signIn, signOut, useSession } from 'next-auth/react';
const mockedSignIn = vi.mocked(signIn);
const mockedSignOut = vi.mocked(signOut);
const mockedUseSession = vi.mocked(useSession);

describe('SignInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign in button with Google text', () => {
    render(<SignInButton />);
    expect(screen.getByRole('button')).toHaveTextContent('Sign in with Google');
  });

  it('calls signIn with google provider when clicked', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockedSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
  });

  it('applies custom className', () => {
    render(<SignInButton className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});

describe('SignOutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sign out button', () => {
    render(<SignOutButton />);
    expect(screen.getByRole('button')).toHaveTextContent('Sign out');
  });

  it('calls signOut when clicked', () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockedSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
  });

  it('applies custom className', () => {
    render(<SignOutButton className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });
});

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while session is loading', () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    });

    const { container } = render(<UserMenu />);
    // Should show loading skeleton with animate-pulse class
    const skeleton = container.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('shows sign in button when unauthenticated', () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    render(<UserMenu />);
    expect(screen.getByRole('button')).toHaveTextContent('Sign in with Google');
  });

  it('shows avatar button when authenticated, reveals dropdown on click', () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
        },
        expires: '2099-01-01',
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<UserMenu />);
    const avatarButton = screen.getByTitle('Test User');
    expect(avatarButton).toBeInTheDocument();
    expect(screen.getByAltText('Test User')).toHaveAttribute('src', 'https://example.com/avatar.jpg');

    // Dropdown not visible yet
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();

    // Click avatar to open dropdown
    fireEvent.click(avatarButton);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('shows user initial when no image is provided', () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-456',
          name: 'John Doe',
          email: 'john@example.com',
          image: null,
        },
        expires: '2099-01-01',
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<UserMenu />);
    expect(screen.getByText('J')).toBeInTheDocument();

    // Open dropdown to see name
    fireEvent.click(screen.getByTitle('John Doe'));
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows email when name is not available', () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-789',
          name: null,
          email: 'test@example.com',
          image: null,
        },
        expires: '2099-01-01',
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    render(<UserMenu />);
    // Open dropdown to see email
    fireEvent.click(screen.getByTitle('test@example.com'));
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    const { container } = render(<UserMenu className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('Auth integration', () => {
  it('SignInButton triggers Google OAuth flow', () => {
    render(<SignInButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockedSignIn).toHaveBeenCalledWith('google', expect.any(Object));
  });

  it('SignOutButton triggers sign out flow', () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockedSignOut).toHaveBeenCalledWith(expect.any(Object));
  });
});
