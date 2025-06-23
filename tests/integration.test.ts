/**
 * Real Integration Tests with HTTP API
 * Tests actual connectivity with the AgentGo API
 */

import { AgentGo, AgentGoError } from '../src/index';

// Real API key for testing (provided by user)
const AGENTGO_API_KEY = process.env.AGENTGO_API_KEY;

// Skip these tests if no real API key is available
const describeRealTests = AGENTGO_API_KEY ? describe : describe.skip;

describeRealTests('Real AgentGo API Integration', () => {
  let client: AgentGo;
  let createdSessionId: string | null = null;

  beforeAll(() => {
    client = new AgentGo({
      apiKey: AGENTGO_API_KEY,
      timeout: 30000, // 30 second timeout for real API calls
    });
  });

  afterAll(async () => {
    // Clean up any created sessions
    if (createdSessionId) {
      try {
        // Note: The API doesn't seem to have a delete endpoint based on the docs
        // Sessions will expire automatically
        console.log(`Session ${createdSessionId} will expire automatically`);
      } catch (error) {
        console.warn('Failed to clean up session:', error);
      }
    }
  });

  describe('Connection and Configuration', () => {
    it('should connect to the real API successfully', async () => {
      const result = await client.testConnection();
      expect(result).toBe(true);
    });

    it('should have correct base URL configuration', () => {
      const config = client.getConfig();
      expect(config.baseURL).toBe('https://session.browsers.live');
    });

    it('should return correct SDK info', () => {
      const info = client.getInfo();
      expect(info.version).toBe('1.0.0');
      expect(info.userAgent).toBe('agentgo-node/1.0.0');
      expect(info.runtime.baseURL).toBe('https://session.browsers.live');
    });
  });

  describe('Session Management', () => {
    it('should list existing sessions', async () => {
      const response = await client.sessions.list();

      expect(response).toHaveProperty('limit');
      expect(response).toHaveProperty('sessions');
      expect(response).toHaveProperty('total');
      expect(Array.isArray(response.sessions)).toBe(true);
      expect(typeof response.total).toBe('number');

      console.log(`Found ${response.total} existing sessions`);
    });

    it('should create a new session', async () => {
      const session = await client.sessions.create({
        region: 'US',
        keepAlive: true,
      });

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('region');
      expect(session).toHaveProperty('duration');
      expect(session).toHaveProperty('createAt');
      expect(session).toHaveProperty('updateAt');
      expect(session).toHaveProperty('connectionUrl');

      // Validate session properties
      expect(typeof session.id).toBe('string');
      expect(session.id.length).toBeGreaterThan(0);
      expect(['IDLE', 'RUNNING', 'EXPIRED']).toContain(session.status);
      expect(session.region).toBe('US');
      expect(typeof session.duration).toBe('number');
      expect(session.connectionUrl).toMatch(/^wss?:\/\//);

      // Store for cleanup and further tests
      createdSessionId = session.id;

      console.log(
        `Created session: ${session.id} with status: ${session.status}`
      );
    });

    it('should retrieve the created session', async () => {
      if (!createdSessionId) {
        throw new Error('No session was created in previous test');
      }

      const session = await client.sessions.retrieve(createdSessionId);

      expect(session.id).toBe(createdSessionId);
      expect(session).toHaveProperty('status');
      expect(session).toHaveProperty('region');
      expect(session).toHaveProperty('connectionUrl');

      console.log(
        `Retrieved session: ${session.id} with status: ${session.status}`
      );
    });

    it('should get connection info for the created session', async () => {
      if (!createdSessionId) {
        throw new Error('No session was created in previous test');
      }

      const connection = await client.sessions.getConnection(createdSessionId);

      expect(connection).toHaveProperty('id');
      expect(connection).toHaveProperty('connectionUrl');
      expect(connection).toHaveProperty('status');
      expect(connection.id).toBe(createdSessionId);
      expect(connection.connectionUrl).toMatch(/^wss?:\/\//);

      console.log(`Connection URL: ${connection.connectionUrl}`);
    });

    it('should check if the created session is active', async () => {
      if (!createdSessionId) {
        throw new Error('No session was created in previous test');
      }

      const isActive = await client.sessions.isActive(createdSessionId);

      // Should be boolean
      expect(typeof isActive).toBe('boolean');

      console.log(`Session ${createdSessionId} is active: ${isActive}`);
    });

    // Skip this test as the API is very slow for non-existent sessions
    it.skip('should handle non-existent session gracefully', async () => {
      const fakeSessionId = 'non-existent-session-id';

      await expect(client.sessions.retrieve(fakeSessionId)).rejects.toThrow(
        AgentGoError
      );

      // isActive should return false for non-existent sessions
      const isActive = await client.sessions.isActive(fakeSessionId);
      expect(isActive).toBe(false);
    });
  });

  describe('Session Filtering', () => {
    it('should filter sessions by status', async () => {
      const runningResponse = await client.sessions.list({ status: 'RUNNING' });
      const idleResponse = await client.sessions.list({ status: 'IDLE' });

      // All returned sessions should have the requested status
      runningResponse.sessions.forEach((session) => {
        expect(session.status).toBe('RUNNING');
      });

      idleResponse.sessions.forEach((session) => {
        expect(session.status).toBe('IDLE');
      });

      console.log(
        `Running sessions: ${runningResponse.total}, Idle sessions: ${idleResponse.total}`
      );
    });

    it('should filter sessions by region', async () => {
      const usResponse = await client.sessions.list({ region: 'US' });

      // All returned sessions should be in US region
      usResponse.sessions.forEach((session) => {
        expect(session.region).toBe('US');
      });

      console.log(`US region sessions: ${usResponse.total}`);
    });

    it('should respect limit parameter', async () => {
      const limitedResponse = await client.sessions.list({ limit: 1 });

      expect(limitedResponse.limit).toBe(1);
      expect(limitedResponse.sessions.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key', async () => {
      const badClient = new AgentGo({ apiKey: 'invalid-key' });

      await expect(badClient.testConnection()).rejects.toThrow(AgentGoError);
    }, 15000);

    it('should handle network timeouts', async () => {
      const timeoutClient = new AgentGo({
        apiKey: AGENTGO_API_KEY,
        timeout: 1, // Very short timeout
      });

      // This should timeout for most real API calls
      await expect(timeoutClient.sessions.list()).rejects.toThrow();
    }, 10000);
  });
});
