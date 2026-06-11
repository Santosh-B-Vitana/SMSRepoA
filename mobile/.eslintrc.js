module.exports = {
  extends: ['expo', 'eslint:recommended'],
  globals: {
    // React Native / JS runtime globals
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    fetch: 'readonly',
    console: 'readonly',
    process: 'readonly',
    __DEV__: 'readonly',
  },
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.tsx', '**/*.test.ts', '**/*.test.tsx'],
      env: { jest: true },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', '.expo/'],
};
