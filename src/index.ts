/**
 * AgentGo Node.js SDK
 * Main entry point for the AgentGo platform SDK
 */

// Import required components first
import { AgentGoClient, type AgentGoClientOptions } from './core.js';
import { Sessions } from './resources/sessions/sessions.js';
import { AgentGoError } from './error.js';

// Export core types and classes
export { AgentGoError };
export { AgentGoClient, type AgentGoClientOptions } from './core.js';
export { Sessions } from './resources/sessions/sessions.js';

/**
 * Main AgentGo SDK client options
 */
export interface AgentGoOptions extends AgentGoClientOptions {
  /**
   * Your AgentGo API key (required)
   * Can also be set via AGENTGO_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Base URL for the AgentGo API
   * @default 'https://app.agentgo.live'
   */
  baseURL?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Maximum number of retry attempts for failed requests
   * @default 3
   */
  maxRetries?: number;

  /**
   * Additional default headers to include with requests
   */
  defaultHeaders?: Record<string, string>;
}

/**
 * Main AgentGo SDK Client
 *
 * Provides access to all AgentGo platform APIs with built-in error handling,
 * retry logic, and cross-platform compatibility.
 *
 * @example
 * ```typescript
 * import { AgentGo } from 'agentgo-node';
 *
 * const client = new AgentGo({
 *   apiKey: 'your_api_key_here'
 * });
 *
 * // Create a browser session
 * const session = await client.sessions.create({
 *   region: 'US',
 *   keepAlive: true
 * });
 *
 * // List all sessions
 * const sessions = await client.sessions.list();
 * ```
 */
export class AgentGo {
  private readonly _httpClient: AgentGoClient;

  /**
   * Sessions API - Manage browser sessions
   */
  public readonly sessions: Sessions;

  /**
   * Create a new AgentGo SDK client
   *
   * @param options - Configuration options for the client
   *
   * @throws {AgentGoError} When API key is missing or invalid
   *
   * @example
   * ```typescript
   * // Basic usage
   * const client = new AgentGo({
   *   apiKey: 'your_api_key_here'
   * });
   *
   * // With custom configuration
   * const client = new AgentGo({
   *   apiKey: 'your_api_key_here',
   *   baseURL: 'https://custom.agentgo.live',
   *   timeout: 60000,
   *   maxRetries: 5
   * });
   *
   * // Using environment variable (AGENTGO_API_KEY)
   * const client = new AgentGo();
   * ```
   */
  constructor(options: AgentGoOptions = {}) {
    try {
      // Create HTTP client with provided options
      this._httpClient = new AgentGoClient(options);

      // Initialize API resources
      this.sessions = new Sessions(this._httpClient);
    } catch (error) {
      if (error instanceof AgentGoError) {
        throw error;
      }
      throw new AgentGoError(
        'UNKNOWN_ERROR',
        `Failed to initialize AgentGo client: ${String(error)}`
      );
    }
  }

  /**
   * Get the current client configuration
   *
   * @returns Readonly configuration object
   */
  public getConfig(): Readonly<{
    baseURL: string;
    timeout: number;
    maxRetries: number;
  }> {
    return this._httpClient.getConfig();
  }

  /**
   * Test the API connection and authentication
   *
   * @returns Promise resolving to true if connection is successful
   * @throws {AgentGoError} When authentication fails or API is unreachable
   *
   * @example
   * ```typescript
   * try {
   *   await client.testConnection();
   *   console.log('API connection successful');
   * } catch (error) {
   *   console.error('API connection failed:', error.message);
   * }
   * ```
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Test connection by listing sessions with limit 1
      await this.sessions.list({ limit: 1 });
      return true;
    } catch (error) {
      if (error instanceof AgentGoError) {
        throw error;
      }
      throw new AgentGoError(
        'NETWORK_ERROR',
        `Connection test failed: ${String(error)}`
      );
    }
  }

  /**
   * Get SDK version and runtime information
   *
   * @returns Object containing version and runtime details
   */
  public getInfo(): {
    version: string;
    userAgent: string;
    runtime: any;
  } {
    const config = this.getConfig();
    return {
      version: '1.0.0',
      userAgent: 'agentgo-node/1.0.0',
      runtime: {
        baseURL: config.baseURL,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      },
    };
  }
}

// Default export for convenience
export default AgentGo;

// Export commonly used types
export type {
  Session,
  SessionStatus,
  SessionRegion,
  SessionCreateParams,
  SessionListParams,
  SessionListResponse,
  SessionMetadata,
  SessionResourceUsage,
} from './resources/sessions/sessions.js';

// Export client types
export type { RequestOptions, PaginatedResponse } from './core.js';
