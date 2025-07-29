// jest.setup.ts
// Global test setup for Jest - Simple configuration

// Set test timeout
jest.setTimeout(10000);

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';

// Mock console methods to reduce noise (but keep errors visible)
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error, // Keep errors visible for debugging
};

// Global test cleanup
afterEach(() => {
    jest.clearAllMocks();
});

// Mock any global modules that might cause issues
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        quit: jest.fn(),
    }));
});

jest.mock('@neondatabase/serverless', () => ({
    neon: jest.fn(() => jest.fn()),
}));

jest.mock('drizzle-orm/neon-http', () => ({
    drizzle: jest.fn(() => ({})),
}));
