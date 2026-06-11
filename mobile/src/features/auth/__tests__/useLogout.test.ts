/**
 * useLogout unit tests.
 *
 * useLogout accesses Zustand stores via getState(), so it can be called
 * directly without renderHook or a React environment.
 */
import { useLogout } from '../hooks/useLogout';
import { useAuthStore } from '../../../stores/authStore';
import { queryClient } from '../../../api/queryClient';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../api/endpoints/auth', () => ({
  authApi: {
    logout: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockUser = {
  id: '1',
  username: 'test.parent',
  email: 'test@school.com',
  role: 'Parent' as const,
  schoolId: 'school-1',
  fullName: 'Test Parent',
  linkedEntityId: 'guardian-1',
};

describe('useLogout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.getState().setAuth(mockUser, 'access-token', 'refresh-token');
  });

  it('clears the auth store on logout', async () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    const { logout } = useLogout();
    await logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('clears TanStack Query cache on logout', async () => {
    queryClient.setQueryData(['test-key'], { data: 'cached' });
    expect(queryClient.getQueryData(['test-key'])).toBeDefined();

    const { logout } = useLogout();
    await logout();

    expect(queryClient.getQueryData(['test-key'])).toBeUndefined();
  });

  it('navigates to login screen after logout', async () => {
    const { router } = jest.requireMock('expo-router') as { router: { replace: jest.Mock } };

    const { logout } = useLogout();
    await logout();

    expect(router.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('deletes biometric and domain SecureStore keys', async () => {
    const SecureStore = jest.requireMock('expo-secure-store') as {
      deleteItemAsync: jest.Mock;
    };

    const { logout } = useLogout();
    await logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_enabled');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('biometric_prompt_shown');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('school_domain');
  });

  it('calls the server logout endpoint with the refresh token', async () => {
    const { authApi } = jest.requireMock('../../../api/endpoints/auth') as {
      authApi: { logout: jest.Mock };
    };

    const { logout } = useLogout();
    await logout();

    expect(authApi.logout).toHaveBeenCalledWith('refresh-token');
  });
});
