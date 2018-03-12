const Path = require('path');

module.exports = {
  output: {
    devtoolModuleFilenameTemplate(module) {
      return 'file:///' + Path.resolve(module.absoluteResourcePath).replace(/\\/g, '/');
    },
  },
  devtool: 'module-source-maps',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: {
          envName: 'webpack',
        },
      },
    ],
  }
};
