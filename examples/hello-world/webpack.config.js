const config = require('retemplate/webpack.base');
module.exports = {
  ...config,
  context: __dirname,
  resolve: {
    ...config.resolve,
    alias: require('rxjs/_esm2015/path-mapping')(),
  }
};
