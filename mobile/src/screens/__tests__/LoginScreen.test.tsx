/**
 * Login screen component smoke tests.
 *
 * BLOCKED: @testing-library/react-native@14 requires react>=19 + react-native>=0.78.
 * This project is on react@18.3.1 + react-native@0.76.9.
 * Excluded from testPathIgnorePatterns in package.json until the project upgrades to RN 0.78.
 * Tests are valid — run manually after: pnpm add @testing-library/react-native@14 (post-RN-upgrade).
 *
 * Verifies: field rendering, Sign In button state, error message display.
 * Heavy native modules are mocked so tests run without a device.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(false),
  isEnrolledAsync: jest.fn().mockResolvedValue(false),
  authenticateAsync: jest.fn().mockResolvedValue({ success: false }),
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2 },
}));

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }),
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: { isWhiteLabel: false },
    },
  },
}));

const mockLoginFn = jest.fn();
jest.mock('@/api/endpoints/auth', () => ({
  authApi: {
    login: mockLoginFn,
    logout: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/stores/authStore', () => ({
  useAuthStore: jest.fn(() => ({
    setAuth: jest.fn(),
    isAuthenticated: false,
    user: null,
  })),
}));

jest.mock('@/stores/schoolStore', () => ({
  useSchoolStore: jest.fn(() => ({
    branding: null,
    domain: 'demo.vitanasms.com',
    setBranding: jest.fn(),
  })),
}));

jest.mock('@/api/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
    invalidateQueries: jest.fn(),
  },
}));

jest.mock('@/theme/tokens', () => ({
  VITANA_COLORS: {
    primary: '#1e40af',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    surface: '#f9fafb',
    error: '#dc2626',
  },
}));

jest.mock('@/lib/analytics', () => ({
  track: jest.fn(),
  identifyUser: jest.fn(),
}));

jest.mock('@sentry/react-native', () => ({
  setUser: jest.fn(),
  init: jest.fn(),
  wrap: jest.fn((comp: unknown) => comp),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Feather: 'Feather',
}));

// ─── Import component after mocks ────────────────────────────────────────────

import LoginScreen from '../../../app/(auth)/login';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Sign In heading', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign in to your account')).toBeTruthy();
  });

  it('renders Username and Password input fields', () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText('Username or email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('renders a Sign In button', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('shows validation errors when Sign In is tapped with empty fields', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Username is required')).toBeTruthy();
    });
  });

  it('does not call authApi.login when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);
    fireEvent.press(getByText('Sign In'));
    await waitFor(() => {});
    expect(mockLoginFn).not.toHaveBeenCalled();
  });

  it('calls authApi.login when valid credentials are entered', async () => {
    mockLoginFn.mockResolvedValueOnce({
      token: 'access-token',
      refreshToken: 'refresh-token',
      user: { id: '1', role: 'Parent', schoolId: 's1', fullName: 'Test', username: 'u', email: 'u@s.com', linkedEntityId: 'g1' },
    });

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Username or email'), 'demo.parent@demo.vitanasms.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'Demo@12345');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockLoginFn).toHaveBeenCalledWith({
        username: 'demo.parent@demo.vitanasms.com',
        password: 'Demo@12345',
      });
    });
  });

  it('displays an API error message when login fails', async () => {
    const { ApiError } = jest.requireActual('@/api/client') as typeof import('@/api/client');
    mockLoginFn.mockRejectedValueOnce(new ApiError('Incorrect username or password.', 401));

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText('Username or email'), 'bad@user.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'wrongpass');
    fireEvent.press(getByText('Sign In'));

    const errorMsg = await findByText('Incorrect username or password.');
    expect(errorMsg).toBeTruthy();
  });
});
