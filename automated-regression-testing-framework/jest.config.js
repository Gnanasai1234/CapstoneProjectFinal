module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src/tests'],
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/utils/helper.js'],
  reporters: ['default', ['jest-junit', { outputDirectory: '<rootDir>/reports' }]],
};