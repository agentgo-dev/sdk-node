/**
 * Jest test setup
 * Global configuration for test environment
 */

// Mock environment variables for tests
process.env.AGENTGO_API_KEY = 'test_api_key_123';

// Mock console methods to reduce noise in tests
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Global test timeout
jest.setTimeout(10000);
