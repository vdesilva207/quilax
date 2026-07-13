module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.e2e.test.js'],
  testTimeout: 120000,
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  setupFilesAfterEnv: ['./init.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/node_modules/'],
};
