module.exports = {
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useSegments: () => [],
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: 'Link',
  Stack: { Screen: 'StackScreen' },
  Tabs: { Screen: 'TabsScreen' },
};
