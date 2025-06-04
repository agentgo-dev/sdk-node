/**
 * Sessions API Resource
 * Manages AgentGo browser sessions
 */

import { APIResource } from '../../resource';
import type { AgentGoClient } from '../../resource';

// Session status types
export type SessionStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

// Geographic regions
export type SessionRegion = 'US';

// Session creation parameters
export interface SessionCreateParams {
  /**
   * Your AgentGo API key
   */
  apiKey?: string;

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

// Session metadata
export interface SessionMetadata {
  userAgent: string;
  resolution: string;
  lastActivity?: string;
}

// Session resource usage
export interface SessionResourceUsage {
  memoryUsage: number;
  cpuUsage: number;
  networkBytes: number;
}

// Main session object
export interface Session {
  /**
   * Session unique identifier (auto-generated)
   */
  id: string;

  /**
   * Session creation timestamp (ISO 8601)
   */
  createdAt: string;

  /**
   * Session last update timestamp (ISO 8601)
   */
  updatedAt: string;

  /**
   * Session start timestamp (ISO 8601)
   */
  startedAt?: string;

  /**
   * Session end timestamp (ISO 8601), null if still running
   */
  endedAt?: string | null;

  /**
   * Session status
   */
  status: SessionStatus;

  /**
   * Geographic region where session is running
   */
  region: SessionRegion;

  /**
   * Whether keep-alive mode is enabled
   */
  keepAlive: boolean;

  /**
   * Associated playground ID (if applicable)
   */
  playgroundId?: string | null;

  /**
   * Playwright connection URL
   */
  connectionUrl: string;

  /**
   * Session timeout in seconds
   */
  timeout: number;

  /**
   * Maximum pages allowed per browser
   */
  maxPages: number;

  /**
   * Current number of active pages
   */
  currentPages?: number;

  /**
   * Duration in seconds (for list responses)
   */
  duration?: number;

  /**
   * Number of pages (for list responses)
   */
  pages?: number;

  /**
   * Session metadata
   */
  metadata: SessionMetadata;

  /**
   * Resource usage information (for detailed responses)
   */
  resourceUsage?: SessionResourceUsage;
}

// Session list response
export interface SessionListResponse {
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
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
      apiKey: params.apiKey,
      region: params.region ?? 'US',
      keepAlive: params.keepAlive ?? false,
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
   * // Get all running sessions
   * const sessions = await client.sessions.list({
   *   status: 'RUNNING',
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
   * const session = await client.sessions.retrieve('session-auto-generated-123');
   * console.log('Session status:', session.status);
   * console.log('Resource usage:', session.resourceUsage);
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
}
