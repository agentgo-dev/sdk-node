/**
 * Jest test setup
 * Global configuration for test environment
 */

// Note: Environment variables are set per test case

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
jest.setTimeout(30000);
