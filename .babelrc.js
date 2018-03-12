module.exports = api => {
  const env = api.env();

  return {
    presets: [
      ['@babel/env', {
        modules: env === 'webpack' ? false : 'commonjs',
        targets: {
          chrome: 62,
        },
      }],
      '@babel/typescript',
    ],
    plugins: [
      '@babel/proposal-object-rest-spread',
    ],
  };
};
