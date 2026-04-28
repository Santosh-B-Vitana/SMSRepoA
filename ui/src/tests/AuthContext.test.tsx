/**
 * AuthContext — unit tests
 *
 * Verifies session storage behaviour, expiry detection, and login/logout flows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

// ── mock axios ───────────────────────────────────────────────────────────────
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// ── test consumer component ──────────────────────────────────────────────────
function AuthStatusDisplay() {
  const { user, isAuthenticated } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'guest'}</div>
      <div data-testid="user-name">{user?.name ?? 'none'}</div>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthStatusDisplay />
    </AuthProvider>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('starts unauthenticated when no session is stored', async () => {
    renderAuth();
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });
  });

  it('restores authenticated state from a valid stored session', async () => {
    const session = {
      user: { id: '1', name: 'Test Admin', email: 'a@b.com', role: 'admin' },
      sessionId: 'abc',
      expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour from now
      createdAt: Date.now(),
      token: 'jwt-token',
    };
    sessionStorage.setItem('auth_session', JSON.stringify(session));

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('user-name')).toHaveTextContent('Test Admin');
    });
  });

  it('does not restore an expired session', async () => {
    const expired = {
      user: { id: '1', name: 'Old User', email: 'x@y.com', role: 'admin' },
      sessionId: 'xyz',
      expiresAt: Date.now() - 1000, // already expired
      createdAt: Date.now() - 9 * 60 * 60 * 1000,
      token: 'old-token',
    };
    sessionStorage.setItem('auth_session', JSON.stringify(expired));

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    });
    // Expired session must be purged
    expect(sessionStorage.getItem('auth_session')).toBeNull();
  });

  it('stores token in localStorage after successful API login', async () => {
    (mockedAxios.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        data: {
          token: 'new-jwt',
          refreshToken: 'new-refresh',
          expiration: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          user: {
            id: 42,
            firstName: 'Rajesh',
            lastName: 'Sharma',
            email: 'rajesh@school.edu',
            role: 'admin',
            schoolId: 'school-1',
          },
        },
      },
    });

    function LoginTrigger() {
      const { login } = useAuth();
      return (
        <button onClick={() => login('rajesh@school.edu', 'ValidPass@123')}>Login</button>
      );
    }

    const { getByText } = render(
      <AuthProvider>
        <LoginTrigger />
      </AuthProvider>
    );

    await act(async () => {
      getByText('Login').click();
    });

    await waitFor(() => {
      expect(localStorage.getItem('authToken')).toBe('new-jwt');
    });
  });

  it('throws on failed API login and does not store a session', async () => {
    (mockedAxios.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { message: 'Invalid credentials' } },
    });

    let caughtError: Error | null = null;

    function FailingLogin() {
      const { login } = useAuth();
      const attempt = async () => {
        try {
          await login('bad@user.com', 'WrongPass');
        } catch (e) {
          caughtError = e as Error;
        }
      };
      return <button onClick={attempt}>Try Login</button>;
    }

    const { getByText } = render(
      <AuthProvider>
        <FailingLogin />
      </AuthProvider>
    );

    await act(async () => {
      getByText('Try Login').click();
    });

    await waitFor(() => {
      expect(caughtError).not.toBeNull();
      expect(caughtError!.message).toMatch(/invalid credentials/i);
    });
    expect(sessionStorage.getItem('auth_session')).toBeNull();
  });
});
