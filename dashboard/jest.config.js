/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
      },
    ],
  },
  moduleNameMapper: {
    '^.+\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^shared/(.*)$': '<rootDir>/src/shared/$1',
    '^components/(.*)$': '<rootDir>/src/components/$1',
    '^assets/(.*)$': '<rootDir>/src/assets/$1',
  },
};