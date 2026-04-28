/**
 * ProtectedRoute — unit tests
 *
 * Verifies that unauthenticated users are redirected to /login
 * and that role-restricted routes redirect to the user's own dashboard.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import * as AuthCtx from '@/contexts/AuthContext';
import * as PermCtx from '@/contexts/PermissionsContext';

// ── helpers ──────────────────────────────────────────────────────────────────

function mockAuth(overrides: Partial<AuthCtx.AuthContextType> = {}) {
  vi.spyOn(AuthCtx, 'useAuth').mockReturnValue({
    user: null,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    isAuthenticated: false,
    sessionExpiresAt: null,
    refreshSession: vi.fn(),
    ...overrides,
  });
}

function mockPermissions() {
  vi.spyOn(PermCtx, 'usePermissions').mockReturnValue({
    permissions: [],
    isModuleEnabled: () => true,
    loading: false,
    hasPermission: () => true,
  } as any);
}

function renderWithRouter(ui: React.ReactElement, initialPath = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/admin-dashboard" element={<div data-testid="admin-dashboard">Admin</div>} />
        <Route path="/staff-dashboard" element={<div data-testid="staff-dashboard">Staff</div>} />
        <Route path="/protected" element={ui} />
      </Routes>
    </MemoryRouter>
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockPermissions();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated user to /login', () => {
    mockAuth({ isAuthenticated: false, user: null });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Secret</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children for authenticated user with no role restriction', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '1', name: 'Admin', email: 'a@b.com', role: 'admin' },
    });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Dashboard</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects staff user away from admin-only route to their dashboard', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '2', name: 'Staff', email: 's@b.com', role: 'staff' },
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
        <div data-testid="admin-only">Admin Only</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('staff-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-only')).not.toBeInTheDocument();
  });

  it('shows loader while authentication is in progress', () => {
    mockAuth({ loading: true, isAuthenticated: false, user: null });

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="content">Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText(/verifying authentication/i)).toBeInTheDocument();
    expect(screen.queryByTestId('content')).not.toBeInTheDocument();
  });

  it('allows super_admin to access super_admin-only routes', () => {
    mockAuth({
      isAuthenticated: true,
      user: { id: '3', name: 'SA', email: 'sa@b.com', role: 'super_admin' },
    });

    renderWithRouter(
      <ProtectedRoute allowedRoles={['super_admin']}>
        <div data-testid="sa-content">SuperAdmin Area</div>
      </ProtectedRoute>
    );

    expect(screen.getByTestId('sa-content')).toBeInTheDocument();
  });
});
