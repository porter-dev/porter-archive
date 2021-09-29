const path = require("path");

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  testEnvironment: "jest-environment-jsdom",
  moduleDirectories: [path.resolve(__dirname, "src"), "node_modules"],
  moduleFileExtensions: [
    "*",
    ".tsx",
    ".ts",
    ".js",
    ".jsx",
    ".json",
    "js",
    "jsx",
    "ts",
    "tsx",
    "json",
    "node",
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less)$": "<rootDir>/__mocks__/styleMock.js",
  },
  setupFilesAfterEnv: ["regenerator-runtime/runtime", "core-js/stable"],
};
