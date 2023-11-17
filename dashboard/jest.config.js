/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^.+\\.(jpg|jpeg|png|gif|webp|svg)$": "<rootDir>/src/__mocks__/fileMock.js",
    "^shared/(.*)$": "<rootDir>/src/shared/$1",
    "^components/(.*)$": "<rootDir>/src/components/$1",
    "^assets/(.*)$": "<rootDir>/src/assets/$1",
  },
};
