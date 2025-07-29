import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000, // Reduced timeout for simple tests
  detectOpenHandles: false, // Disabled for simple tests
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Collect coverage from source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/drizzle/migrations/**',
    '!src/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  // Suppress console output during tests
  silent: true,
};

export default config;
