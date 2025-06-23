/**
 * Sessions API Resource
 * Manages AgentGo browser sessions
 */

import { APIResource } from '../../resource';
import type { AgentGoClient } from '../../resource';

// Session status types
export type SessionStatus = 'IDLE' | 'RUNNING' | 'EXPIRED';

// Geographic regions
export type SessionRegion = 'US';

// Session creation parameters
export interface SessionCreateParams {
  /**
   * Geographic region code. Currently supported: US (default)
   */
  region?: SessionRegion;

  /**
   * Whether to keep session persistently active, preventing 30-second timeout
   */
  keepAlive?: boolean;
}

// Session list parameters
export interface SessionListParams {
  /**
   * Filter by session status
   */
  status?: SessionStatus;

  /**
   * Filter by geographic region
   */
  region?: SessionRegion;

  /**
   * Maximum number of results to return (1-100)
   */
  limit?: number;

  /**
   * Pagination offset
   */
  offset?: number;
}


// Main session object
export interface Session {
  /**
   * Session unique identifier (auto-generated)
   */
  id: string;

  /**
   * Geographic region where session is running
   */
  region: SessionRegion;

  /**
   * Session status
   */
  status: SessionStatus;

  /**
   * Session duration in seconds
   */
  duration: number;

  /**
   * Session creation timestamp (ISO 8601)
   */
  createAt: string;

  /**
   * Session last update timestamp (ISO 8601)
   */
  updateAt: string;

  /**
   * WebSocket connection URL for browser automation
   */
  connectionUrl: string;
}

// Session list response
export interface SessionListResponse {
  limit: number;
  sessions: Session[];
  total: number;
}

/**
 * Sessions resource for managing browser sessions
 */
export class Sessions extends APIResource {
  constructor(client: AgentGoClient) {
    super(client);
  }

  /**
   * Create a new browser session
   *
   * @param params - Session creation parameters
   * @returns Promise resolving to the created session
   *
   * @example
   * ```typescript
   * const session = await client.sessions.create({
   *   region: 'US',
   *   keepAlive: true
   * });
   * console.log('Session ID:', session.id);
   * console.log('Connection URL:', session.connectionUrl);
   * ```
   */
  async create(params: SessionCreateParams = {}): Promise<Session> {
    const body = this._cleanParams({
      region: params.region ?? 'US',
      keepAlive: params.keepAlive ?? true,
    });

    return this._post<Session>('/api/v1/sessions', body);
  }

  /**
   * List browser sessions
   *
   * @param params - Filtering and pagination parameters
   * @returns Promise resolving to paginated session list
   *
   * @example
   * ```typescript
   * // Get all idle sessions
   * const sessions = await client.sessions.list({
   *   status: 'IDLE',
   *   limit: 10
   * });
   *
   * console.log(`Found ${sessions.total} sessions`);
   * sessions.sessions.forEach(session => {
   *   console.log(`Session ${session.id}: ${session.status}`);
   * });
   * ```
   */
  async list(params: SessionListParams = {}): Promise<SessionListResponse> {
    const query = this._cleanParams({
      status: params.status,
      region: params.region,
      limit: params.limit,
      offset: params.offset,
    });

    return this._get<SessionListResponse>('/api/v1/sessions', query);
  }

  /**
   * Retrieve a specific session by ID
   *
   * @param sessionId - The unique session identifier
   * @returns Promise resolving to the session details
   *
   * @example
   * ```typescript
   * const session = await client.sessions.retrieve('d7644b7e_637d3df1e086a');
   * console.log('Session status:', session.status);
   * console.log('Connection URL:', session.connectionUrl);
   * ```
   */
  async retrieve(sessionId: string): Promise<Session> {
    this._validateRequired({ sessionId }, ['sessionId']);

    return this._get<Session>(
      `/api/v1/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Get session connection information
   *
   * @param sessionId - The unique session identifier
   * @returns Promise resolving to session connection details
   */
  async getConnection(
    sessionId: string
  ): Promise<Pick<Session, 'id' | 'connectionUrl' | 'status'>> {
    const session = await this.retrieve(sessionId);
    return {
      id: session.id,
      connectionUrl: session.connectionUrl,
      status: session.status,
    };
  }

  /**
   * Check if a session is active (running)
   *
   * @param sessionId - The unique session identifier
   * @returns Promise resolving to boolean indicating if session is active
   */
  async isActive(sessionId: string): Promise<boolean> {
    try {
      const session = await this.retrieve(sessionId);
      return session.status === 'RUNNING';
    } catch (error) {
      // If session not found or other error, consider it inactive
      return false;
    }
  }

  /**
   * Check if a session is idle and available for use
   *
   * @param sessionId - The unique session identifier
   * @returns Promise resolving to boolean indicating if session is idle
   */
  async isIdle(sessionId: string): Promise<boolean> {
    try {
      const session = await this.retrieve(sessionId);
      return session.status === 'IDLE';
    } catch (error) {
      return false;
    }
  }
}
