/**
 * AgentGo Main Client Integration Tests
 */

import { AgentGo, AgentGoError } from '../src/index';

// Mock the fetch function for tests
global.fetch = jest.fn();
(globalThis as any).fetch = global.fetch;

describe('AgentGo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variable
    delete process.env.AGENTGO_API_KEY;
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
    });

    it('should throw error if no API key provided', () => {
      expect(() => new AgentGo()).toThrow(AgentGoError);
    });

    it('should create client with custom configuration', () => {
      const client = new AgentGo({
        apiKey: 'test-key',
        baseURL: 'https://custom.session.browsers.live',
        timeout: 60000,
        maxRetries: 5,
      });

      const config = client.getConfig();
      expect(config.baseURL).toBe('https://custom.session.browsers.live');
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

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(mockResponse),
      });

      const client = new AgentGo({ apiKey: 'test-key' });
      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should throw error on failed connection', async () => {
      const errorResponse = {
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(errorResponse),
      });

      const client = new AgentGo({ apiKey: 'invalid-key' });

      await expect(client.testConnection()).rejects.toThrow(AgentGoError);
    });

    it('should throw network error on fetch failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const client = new AgentGo({ apiKey: 'test-key' });

      await expect(client.testConnection()).rejects.toThrow(AgentGoError);
    });
  });

  describe('getInfo', () => {
    it('should return SDK information', () => {
      const client = new AgentGo({ apiKey: 'test-key' });
      const info = client.getInfo();

      expect(info).toEqual({
        version: '1.0.0',
        userAgent: 'agentgo-node/1.0.0',
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
        baseURL: 'https://custom.session.browsers.live',
        timeout: 60000,
      });

      const info = client.getInfo();

      expect(info.runtime.baseURL).toBe('https://custom.session.browsers.live');
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
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: jest.fn().mockResolvedValue(mockSession),
      });

      // Mock retrieve session response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
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
    });
  });

  describe('error handling', () => {
    it('should propagate AgentGoError', async () => {
      const errorResponse = {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers([['retry-after', '60']]),
        json: jest.fn().mockResolvedValue(errorResponse),
      });

      const client = new AgentGo({ apiKey: 'test-key' });

      try {
        await client.sessions.create();
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(AgentGoError);
        expect((error as AgentGoError).type).toBe('RATE_LIMIT_EXCEEDED');
        expect((error as AgentGoError).retryAfter).toBe(60);
      }
    });

    it('should handle network timeouts', async () => {
      (global.fetch as jest.Mock).mockImplementation(
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
