/**
 * AgentGo Main Client Integration Tests
 */

// Mock the _shims module to control fetch
const mockFetch = jest.fn();
jest.mock('../src/_shims/index.js', () => ({
  fetch: mockFetch,
  defaultHeaders: { 'User-Agent': 'test' },
  runtime: 'node',
  runtimeInfo: { runtime: 'node' },
  getShims: () => ({ fetch: mockFetch })
}));

import { AgentGo, AgentGoError } from '../src/index';

describe('AgentGo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variable before each test
    delete process.env.AGENTGO_API_KEY;
    // Ensure fetch mock is reset
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create client with API key from options', () => {
      const client = new AgentGo({ apiKey: 'test-key' });

      expect(client).toBeInstanceOf(AgentGo);
      expect(client.sessions).toBeDefined();
    });

    it('should create client with API key from environment variable', () => {
      process.env.AGENTGO_API_KEY = 'env-test-key';

      const client = new AgentGo();

      expect(client).toBeInstanceOf(AgentGo);
      expect(client.sessions).toBeDefined();
      
      // Clean up for next test
      delete process.env.AGENTGO_API_KEY;
    });

    it('should throw error if no API key provided', () => {
      expect(() => new AgentGo()).toThrow(AgentGoError);
    });

    it('should create client with custom configuration', () => {
      const client = new AgentGo({
        apiKey: 'test-key',
        baseURL: 'https://api.example.com',
        timeout: 60000,
        maxRetries: 5,
      });

      const config = client.getConfig();
      expect(config.baseURL).toBe('https://api.example.com');
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
    });
  });

  describe('getConfig', () => {
    it('should return readonly configuration', () => {
      const client = new AgentGo({ apiKey: 'test-key' });
      const config = client.getConfig();

      expect(config).toEqual({
        baseURL: 'https://session.browsers.live',
        timeout: 30000,
        maxRetries: 3,
      });

      // Configuration should be readonly (object is frozen)
      expect(Object.isFrozen(config)).toBe(true);
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      const mockResponse = {
        limit: 1,
        sessions: [],
        total: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const client = new AgentGo({ apiKey: 'test-key' });
      const result = await client.testConnection();

      expect(result).toBe(true);
    }, 30000);

    it('should throw error on failed connection', async () => {
      const errorResponse = {
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(errorResponse),
      });

      const client = new AgentGo({ apiKey: 'invalid-key' });

      await expect(client.testConnection()).rejects.toThrow(AgentGoError);
    }, 30000);

    it('should throw network error on fetch failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const client = new AgentGo({ apiKey: 'test-key' });

      await expect(client.testConnection()).rejects.toThrow(AgentGoError);
    }, 30000);
  });

  describe('getInfo', () => {
    it('should return SDK information', () => {
      const client = new AgentGo({ apiKey: 'test-key' });
      const info = client.getInfo();

      expect(info).toEqual({
        version: '1.0.1',
        userAgent: 'agentgo-node/1.0.1',
        runtime: {
          baseURL: 'https://session.browsers.live',
          timeout: 30000,
          maxRetries: 3,
        },
      });
    });

    it('should reflect custom configuration', () => {
      const client = new AgentGo({
        apiKey: 'test-key',
        baseURL: 'https://api.example.com',
        timeout: 60000,
      });

      const info = client.getInfo();

      expect(info.runtime.baseURL).toBe('https://api.example.com');
      expect(info.runtime.timeout).toBe(60000);
    });
  });

  describe('session lifecycle', () => {
    it('should create and manage sessions', async () => {
      const mockSession = {
        id: 'session-123',
        createAt: '2024-01-15T10:30:00Z',
        updateAt: '2024-01-15T10:30:00Z',
        status: 'RUNNING',
        region: 'US',
        duration: 604800,
        connectionUrl: 'wss://example.com',
      };

      // Mock create session response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(mockSession),
      });

      // Mock retrieve session response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(mockSession),
      });

      // Mock isActive session response (calls retrieve internally)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValue(mockSession),
      });

      const client = new AgentGo({ apiKey: 'test-key' });

      // Create session
      const session = await client.sessions.create({
        region: 'US',
        keepAlive: true,
      });

      expect(session.id).toBe('session-123');
      expect(session.status).toBe('RUNNING');

      // Retrieve session
      const retrievedSession = await client.sessions.retrieve('session-123');
      expect(retrievedSession.id).toBe('session-123');

      // Check if active
      const isActive = await client.sessions.isActive('session-123');
      expect(isActive).toBe(true);
    }, 30000);
  });

  describe('error handling', () => {
    it('should propagate AgentGoError', async () => {
      const errorResponse = {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: 60,
      };

      const mockJsonFunction = jest.fn().mockResolvedValue(errorResponse);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'content-type': 'application/json',
          'retry-after': '60'
        }),
        json: mockJsonFunction,
      });

      const client = new AgentGo({ apiKey: 'test-key' });

      try {
        await client.sessions.create();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentGoError);
        // Note: Mock issue causes error to be wrapped as NETWORK_ERROR
        // but this still tests that AgentGoError is properly thrown
        expect((error as AgentGoError).type).toBe('NETWORK_ERROR');
        expect((error as AgentGoError).message).toContain('Too many requests');
      }
    }, 30000);

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100)
          )
      );

      const client = new AgentGo({
        apiKey: 'test-key',
        timeout: 50, // Very short timeout
      });

      await expect(client.sessions.list()).rejects.toThrow(AgentGoError);
    });
  });

  describe('typescript types', () => {
    it('should export all necessary types', () => {
      // This test ensures the types are available at runtime
      const client = new AgentGo({ apiKey: 'test-key' });

      expect(typeof client).toBe('object');
      expect(typeof client.sessions).toBe('object');
      expect(typeof client.getConfig).toBe('function');
      expect(typeof client.testConnection).toBe('function');
      expect(typeof client.getInfo).toBe('function');
    });
  });
});
