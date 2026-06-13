module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@vitana/shared-types': './src/shared-types',
            '@vitana/shared-utils': './src/shared-utils',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
