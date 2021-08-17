const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const dotenv = require("dotenv");

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const TerserPlugin = require("terser-webpack-plugin");

module.exports = () => {
  const env = dotenv.config().parsed;
  const envKeys = Object.keys(env).reduce((prev, next) => {
    prev[`process.env.${next}`] = JSON.stringify(env[next]);
    return prev;
  }, {});
  // Check first the env file and if it's empty, check out the node env of the process.
  let isDevelopment = env.NODE_ENV !== "production";
  if (process.env.NODE_ENV !== env.NODE_ENV) {
    isDevelopment = process.env.NODE_ENV !== "production";
  }
  /**
   * @type {webpack.Configuration}
   */
  const config = {
    entry: "./src/index.tsx",
    target: "web",
    mode: isDevelopment ? "development" : "production",
    module: {
      rules: [
        {
          test: /\.(ts|tsx|mjs|js|jsx)$/,
          exclude: /node_modules/,
          loader: "babel-loader",
        },
        {
          enforce: "pre",
          test: /\.js$/,
          loader: "source-map-loader",
        },
        {
          test: /\.(png|svg|jpg|gif|mp3)$/,
          use: ["file-loader"],
        },
        { test: /\.css$/, use: ["css-loader"] },
        {
          test: /\.(woff(2)?|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
          use: [
            {
              loader: "file-loader",
              options: {
                name: "[name].[ext]",
                outputPath: "fonts/",
              },
            },
          ],
        },
      ],
    },
    resolve: {
      modules: [path.resolve(__dirname, "src"), "node_modules"],
      extensions: ["*", ".tsx", ".ts", ".js", ".jsx", ".json"],
    },
    output: {
      filename: "bundle.js",
      path: path.resolve(__dirname, "build"),
      publicPath: "/",
    },
    devServer: {
      historyApiFallback: true,
      disableHostCheck: true,
      host: "0.0.0.0",
      port: 8080,
      hot: true,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "src", "index.html"),
        segmentKey: `${process.env.SEGMENT_PUBLIC_KEY}`,
      }),
      new webpack.DefinePlugin(envKeys),
    ],
  };

  if (!isDevelopment) {
    config.optimization = {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          test: /\.(ts|tsx|mjs|js|jsx)$/,
          terserOptions: {
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the `compress` and `output`
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              inline: 2,
            },
            mangle: {
              // Find work around for Safari 10+
              safari10: true,
            },
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
          },

          // Use multi-process parallel running to improve the build speed
          parallel: true,
        }),
      ],
    };
  }

  if (env.ENABLE_ANALYZER) {
    config.plugins.push(new BundleAnalyzerPlugin());
  }

  if (env.ENABLE_PROXY === true) {
    config.devServer.proxy = {
      "/api": {
        target: "http://localhost:8081", // target host
        changeOrigin: true, // needed for virtual hosted sites
        ws: true, // proxy websockets
      },
    };
  }

  return config;
};
