module.exports = {
  output: {
    devtoolModuleFilenameTemplate(module) {
      if (module.absoluteResourcePath.startsWith(__dirname)) {
        return `file:///${module.absoluteResourcePath.replace(/\\/g, '/')}`;
      }
      if (/^\w{2,}:/.test(module.resource)) {
        return module.resource;
      }
      return `webpack:///${module.resource}`;
    },
  },
  devtool: 'module-source-maps',
  resolve: {
    extensions: ['.ts', '.mjs', '.js'],
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        exclude: /node_modules/,
        loader: 'source-map-loader',
      },
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: {
          envName: 'webpack',
        },
      },
    ],
  },
};
