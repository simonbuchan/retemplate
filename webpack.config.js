const config = require('./webpack.base');
module.exports = {
  ...config,
  context: __dirname,
  output: {
    ...config.output,
    libraryTarget: 'commonjs2',
  },
};
