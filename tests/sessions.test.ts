/**
 * Sessions API Tests
 */

import {
  Sessions,
  type Session,
  type SessionListResponse,
} from '../src/resources/sessions/sessions';
import { AgentGoError } from '../src/error';
import type { AgentGoClient } from '../src/resource';

// Mock HTTP client
const mockClient: AgentGoClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

describe('Sessions', () => {
  let sessions: Sessions;

  beforeEach(() => {
    sessions = new Sessions(mockClient);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const mockSession: Session = {
      id: 'session-123',
      createAt: '2024-01-15T10:30:00Z',
      updateAt: '2024-01-15T10:30:00Z',
      status: 'RUNNING',
      region: 'US',
      duration: 604800,
      connectionUrl:
        'wss://app.browsers.live?launch-options=%7B%22_apikey%22%3A%22api_key%22%7D',
    };

    it('should create session with default parameters', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessions.create();

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/sessions', {
        body: {
          region: 'US',
          keepAlive: true,
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should create session with custom parameters', async () => {
      (mockClient.post as jest.Mock).mockResolvedValue(mockSession);

      const params = {
        region: 'US' as const,
        keepAlive: true,
      };

      const result = await sessions.create(params);

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/sessions', {
        body: {
          region: 'US',
          keepAlive: true,
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should handle API errors', async () => {
      const error = new AgentGoError('UNAUTHORIZED', 'Invalid API key');
      (mockClient.post as jest.Mock).mockRejectedValue(error);

      await expect(sessions.create()).rejects.toThrow(AgentGoError);
    });
  });

  describe('list', () => {
    const mockListResponse: SessionListResponse = {
      limit: 20,
      sessions: [
        {
          id: 'session-123',
          createAt: '2024-01-15T10:30:00Z',
          updateAt: '2024-01-15T10:35:00Z',
          status: 'RUNNING',
          region: 'US',
          duration: 300,
          connectionUrl: 'wss://example.com',
        },
      ],
      total: 1,
    };

    it('should list sessions with default parameters', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockListResponse);

      const result = await sessions.list();

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/sessions', {
        query: {},
      });
      expect(result).toEqual(mockListResponse);
    });

    it('should list sessions with filters', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockListResponse);

      const params = {
        status: 'RUNNING' as const,
        region: 'US' as const,
        limit: 10,
      };

      const result = await sessions.list(params);

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/sessions', {
        query: {
          status: 'RUNNING',
          region: 'US',
          limit: 10,
        },
      });
      expect(result).toEqual(mockListResponse);
    });

    it('should handle empty results', async () => {
      const emptyResponse: SessionListResponse = {
        limit: 20,
        sessions: [],
        total: 0,
      };

      (mockClient.get as jest.Mock).mockResolvedValue(emptyResponse);

      const result = await sessions.list();

      expect(result.sessions).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('retrieve', () => {
    const mockSession: Session = {
      id: 'session-123',
      createAt: '2024-01-15T10:30:00Z',
      updateAt: '2024-01-15T10:35:00Z',
      status: 'RUNNING',
      region: 'US',
      duration: 604800,
      connectionUrl:
        'wss://app.browsers.live?launch-options=%7B%22_session%22%3A%22session-123%22%7D',
    };

    it('should retrieve session by ID', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessions.retrieve('session-123');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/sessions/session-123',
        undefined
      );
      expect(result).toEqual(mockSession);
    });

    it('should URL encode session ID', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockSession);

      await sessions.retrieve('session-with-special@chars');

      expect(mockClient.get).toHaveBeenCalledWith(
        '/api/v1/sessions/session-with-special%40chars',
        undefined
      );
    });

    it('should throw error for missing session ID', async () => {
      await expect(sessions.retrieve('')).rejects.toThrow(
        'Missing required parameters: sessionId'
      );
    });

    it('should handle not found error', async () => {
      const error = new AgentGoError('SESSION_NOT_FOUND', 'Session not found');
      (mockClient.get as jest.Mock).mockRejectedValue(error);

      await expect(sessions.retrieve('nonexistent')).rejects.toThrow(
        AgentGoError
      );
    });
  });

  describe('getConnection', () => {
    const mockSession: Session = {
      id: 'session-123',
      createAt: '2024-01-15T10:30:00Z',
      updateAt: '2024-01-15T10:30:00Z',
      status: 'RUNNING',
      region: 'US',
      duration: 604800,
      connectionUrl: 'wss://example.com',
    };

    it('should return connection information', async () => {
      (mockClient.get as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessions.getConnection('session-123');

      expect(result).toEqual({
        id: 'session-123',
        connectionUrl: 'wss://example.com',
        status: 'RUNNING',
      });
    });
  });

  describe('isActive', () => {
    it('should return true for running session', async () => {
      const mockSession: Session = {
        id: 'session-123',
        createAt: '2024-01-15T10:30:00Z',
        updateAt: '2024-01-15T10:30:00Z',
        status: 'RUNNING',
        region: 'US',
        duration: 604800,
        connectionUrl: 'wss://example.com',
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessions.isActive('session-123');

      expect(result).toBe(true);
    });

    it('should return false for expired session', async () => {
      const mockSession: Session = {
        id: 'session-123',
        createAt: '2024-01-15T10:30:00Z',
        updateAt: '2024-01-15T10:30:00Z',
        status: 'EXPIRED',
        region: 'US',
        duration: 604800,
        connectionUrl: 'wss://example.com',
      };

      (mockClient.get as jest.Mock).mockResolvedValue(mockSession);

      const result = await sessions.isActive('session-123');

      expect(result).toBe(false);
    });

    it('should return false for non-existent session', async () => {
      const error = new AgentGoError('SESSION_NOT_FOUND', 'Session not found');
      (mockClient.get as jest.Mock).mockRejectedValue(error);

      const result = await sessions.isActive('nonexistent');

      expect(result).toBe(false);
    });
  });
});
