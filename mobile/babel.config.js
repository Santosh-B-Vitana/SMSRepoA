module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isTest = process.env.NODE_ENV === 'test';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // nativewind/babel is incompatible with the Jest transform pipeline;
      // className props are not needed in unit/integration tests
      ...(isTest ? [] : ['nativewind/babel']),
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};
