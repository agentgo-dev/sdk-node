/**
 * AgentGo Error System Tests
 */

import { AgentGoError, type AgentGoErrorResponse } from '../src/error';

describe('AgentGoError', () => {
  describe('constructor', () => {
    it('should create error with basic parameters', () => {
      const error = new AgentGoError('UNAUTHORIZED', 'Invalid API key');

      expect(error.name).toBe('AgentGoError');
      expect(error.type).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid API key');
      expect(error.status).toBeUndefined();
      expect(error.details).toBeUndefined();
      expect(error.retryAfter).toBeUndefined();
    });

    it('should create error with all parameters', () => {
      const details = { field: 'apiKey', issue: 'missing' };
      const error = new AgentGoError(
        'INVALID_REQUEST',
        'Bad request',
        400,
        details,
        60
      );

      expect(error.type).toBe('INVALID_REQUEST');
      expect(error.message).toBe('Bad request');
      expect(error.status).toBe(400);
      expect(error.details).toEqual(details);
      expect(error.retryAfter).toBe(60);
    });

    it('should be instance of Error', () => {
      const error = new AgentGoError('NETWORK_ERROR', 'Connection failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AgentGoError);
    });
  });

  describe('fromResponse', () => {
    it('should create error from response with error body', () => {
      const response = new Response('', { status: 401 });
      const errorBody: AgentGoErrorResponse = {
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
        details: { field: 'apiKey' },
      };

      const error = AgentGoError.fromResponse(response, errorBody);

      expect(error.type).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Invalid API key');
      expect(error.status).toBe(401);
      expect(error.details).toEqual({ field: 'apiKey' });
    });

    it('should map HTTP status codes correctly', () => {
      const testCases = [
        { status: 400, expectedType: 'INVALID_REQUEST' },
        { status: 401, expectedType: 'UNAUTHORIZED' },
        { status: 404, expectedType: 'SESSION_NOT_FOUND' },
        { status: 429, expectedType: 'RATE_LIMIT_EXCEEDED' },
        { status: 500, expectedType: 'INTERNAL_SERVER_ERROR' },
        { status: 502, expectedType: 'INTERNAL_SERVER_ERROR' },
        { status: 418, expectedType: 'UNKNOWN_ERROR' },
      ];

      testCases.forEach(({ status, expectedType }) => {
        const response = new Response('', { status });
        const error = AgentGoError.fromResponse(response);

        expect(error.type).toBe(expectedType);
        expect(error.status).toBe(status);
      });
    });
  });

  describe('static factory methods', () => {
    it('should create network error', () => {
      const error = AgentGoError.networkError('Connection timeout');

      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.message).toBe('Connection timeout');
    });

    it('should create timeout error', () => {
      const error = AgentGoError.timeoutError('Request timeout');

      expect(error.type).toBe('TIMEOUT_ERROR');
      expect(error.message).toBe('Request timeout');
    });
  });

  describe('isRetryable', () => {
    it('should correctly identify retryable errors', () => {
      const retryableTypes = [
        'RATE_LIMIT_EXCEEDED',
        'INTERNAL_SERVER_ERROR',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR',
      ];

      retryableTypes.forEach((type) => {
        const error = new AgentGoError(type as any, 'Test message');
        expect(error.isRetryable()).toBe(true);
      });
    });

    it('should correctly identify non-retryable errors', () => {
      const nonRetryableTypes = [
        'UNAUTHORIZED',
        'INVALID_REQUEST',
        'SESSION_NOT_FOUND',
        'UNKNOWN_ERROR',
      ];

      nonRetryableTypes.forEach((type) => {
        const error = new AgentGoError(type as any, 'Test message');
        expect(error.isRetryable()).toBe(false);
      });
    });
  });

  describe('getRetryDelay', () => {
    it('should use retryAfter when available', () => {
      const error = new AgentGoError(
        'RATE_LIMIT_EXCEEDED',
        'Rate limited',
        429,
        {},
        30
      );
      expect(error.getRetryDelay()).toBe(30000); // 30 seconds in ms
    });

    it('should return correct default delays', () => {
      const testCases = [
        { type: 'RATE_LIMIT_EXCEEDED', expected: 60000 },
        { type: 'INTERNAL_SERVER_ERROR', expected: 5000 },
        { type: 'NETWORK_ERROR', expected: 1000 },
        { type: 'TIMEOUT_ERROR', expected: 2000 },
        { type: 'UNAUTHORIZED', expected: 1000 },
      ];

      testCases.forEach(({ type, expected }) => {
        const error = new AgentGoError(type as any, 'Test message');
        expect(error.getRetryDelay()).toBe(expected);
      });
    });
  });

  describe('toJSON', () => {
    it('should serialize basic error correctly', () => {
      const error = new AgentGoError('UNAUTHORIZED', 'Invalid API key');
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'UNAUTHORIZED',
        message: 'Invalid API key',
      });
    });

    it('should serialize complete error correctly', () => {
      const details = { field: 'apiKey', issue: 'missing' };
      const error = new AgentGoError(
        'INVALID_REQUEST',
        'Bad request',
        400,
        details,
        60
      );
      const json = error.toJSON();

      expect(json).toEqual({
        error: 'INVALID_REQUEST',
        message: 'Bad request',
        details,
        retryAfter: 60,
      });
    });
  });
});
