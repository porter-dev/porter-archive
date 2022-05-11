const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");

const dotenv = require("dotenv");

const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;

const TerserPlugin = require("terser-webpack-plugin");

module.exports = () => {
  let env = dotenv.config().parsed;

  if (!env) {
    env = process.env;
  }
  const envKeys = Object.keys(env).reduce((prev, next) => {
    const varName = `process.env.${next}`;
    if (typeof env[next] !== "string") return prev;

    if (env[next].toLowerCase() === "true") {
      prev[varName] = true;
    } else if (env[next].toLowerCase() === "false") {
      prev[varName] = false;
    } else {
      prev[varName] = JSON.stringify(env[next]);
    }

    return prev;
  }, {});

  // Check first the env file and if it's empty, check out the node env of the process.
  let isDevelopment = env.NODE_ENV !== "production";
  if (process.env.NODE_ENV !== env.NODE_ENV) {
    isDevelopment = process.env.NODE_ENV !== "production";
  }

  let htmlPluginOpts = {
    template: path.resolve(__dirname, "src", "index.html"),
  };

  if (env.IS_HOSTED) {
    htmlPluginOpts = {
      template: path.resolve(__dirname, "src", "hosted.index.html"),
      cohereKey: `${env.COHERE_KEY}`,
      intercomAppId: `${env.INTERCOM_APP_ID}`,
      intercomSrc: `${process.env.INTERCOM_SRC}`,
      segmentWriteKey: `${process.env.SEGMENT_WRITE_KEY}`,
      segmentKey: `${process.env.SEGMENT_PUBLIC_KEY}`,
    };
  }

  /**
   * @type {webpack.Configuration}
   */
  const config = {
    entry: [
      "core-js/modules/es.promise",
      "core-js/modules/es.array.iterator",
      "./src/index.tsx",
    ],
    target: "web",
    mode: isDevelopment ? "development" : "production",
    devtool: "source-map",
    module: {
      rules: [
        {
          test: /\.(ts|tsx|mjs|js|jsx)$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve("babel-loader"),
              options: {
                plugins: [
                  isDevelopment && require.resolve("react-refresh/babel"),
                ].filter(Boolean),
              },
            },
          ],
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
      port: env.DEV_SERVER_PORT || 8080,
      hot: true,
    },
    plugins: [
      new HtmlWebpackPlugin(htmlPluginOpts),
      new webpack.DefinePlugin(envKeys),
      isDevelopment && new ReactRefreshWebpackPlugin(),
    ].filter(Boolean),
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
  if (env.ENABLE_PROXY) {
    if (!env.API_SERVER) {
      throw new Error(
        "API_SERVER is not present on .env! Please setup the api server url if you want the proxy to work! API_SERVER example: http://localhost:8080"
      );
    }
    config.devServer.proxy = {
      "/api": {
        logLevel: "debug",
        target: env.API_SERVER, // target host
        changeOrigin: true, // needed for virtual hosted sites
        ws: true, // proxy websockets
      },
    };
  }

  return config;
};
