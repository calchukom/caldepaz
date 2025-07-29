import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'], // support flexible test file naming
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // ✅ fix .js import resolution for TS files
    '^@/(.*)$': '<rootDir>/src/$1', // ✅ optional: support `@/` aliases if using in tsconfig
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 30000, // 30 seconds instead of 60
  detectOpenHandles: true, // Detect memory leaks
  forceExit: true, // Force exit after tests complete
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};

export default config;
