const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    'content-standalone': './src/content/content-standalone.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: false // Don't clean other files
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'ts-loader',
          options: {
            configFile: 'tsconfig.json'
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  optimization: {
    minimize: true,
    splitChunks: false // Don't split chunks for standalone
  },
  devtool: false
};
