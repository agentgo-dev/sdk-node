/**
 * TypeScript AgentGo SDK Usage Example
 *
 * This example demonstrates the TypeScript features of the AgentGo SDK
 * including type safety, interfaces, and error handling.
 */

import {
  AgentGo,
  AgentGoError,
  type AgentGoOptions,
  type Session,
  type SessionCreateParams,
  type SessionListParams,
  type SessionStatus,
  type SessionRegion,
} from 'agentgo-node';

interface SessionConfig {
  region: SessionRegion;
  keepAlive: boolean;
  description?: string;
}

class SessionManager {
  private client: AgentGo;
  private activeSessions: Map<string, Session> = new Map();

  constructor(apiKey: string) {
    const options: AgentGoOptions = {
      apiKey,
      timeout: 60000,
      maxRetries: 3,
    };
    this.client = new AgentGo(options);
  }

  /**
   * Test connection to AgentGo API
   */
  async testConnection(): Promise<void> {
    try {
      await this.client.testConnection();
      console.log('✅ Connected to AgentGo API');
    } catch (error) {
      if (error instanceof AgentGoError) {
        throw new Error(`Connection failed: ${error.message} (${error.type})`);
      }
      throw error;
    }
  }

  /**
   * Create a new browser session with specified configuration
   */
  async createSession(config: SessionConfig): Promise<Session> {
    const params: SessionCreateParams = {
      region: config.region,
      keepAlive: config.keepAlive,
    };

    try {
      const session = await this.client.sessions.create(params);
      this.activeSessions.set(session.id, session);

      console.log(`✅ Created session ${session.id} in ${session.region}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Keep Alive: ${session.keepAlive}`);

      return session;
    } catch (error) {
      if (error instanceof AgentGoError) {
        console.error(`❌ Failed to create session: ${error.message}`);

        if (error.isRetryable()) {
          const delay = error.getRetryDelay();
          console.log(`   Retryable error. Suggested delay: ${delay}ms`);
        }
      }
      throw error;
    }
  }

  /**
   * Get detailed information about a session
   */
  async getSessionDetails(sessionId: string): Promise<Session> {
    try {
      const session = await this.client.sessions.retrieve(sessionId);

      console.log(`📊 Session ${sessionId} details:`);
      console.log(`   Status: ${session.status}`);
      console.log(
        `   Created: ${new Date(session.createdAt).toLocaleString()}`
      );
      console.log(
        `   Updated: ${new Date(session.updatedAt).toLocaleString()}`
      );

      if (session.resourceUsage) {
        console.log(`   Memory: ${session.resourceUsage.memoryUsage}MB`);
        console.log(`   CPU: ${session.resourceUsage.cpuUsage}%`);
      }

      return session;
    } catch (error) {
      if (error instanceof AgentGoError && error.type === 'SESSION_NOT_FOUND') {
        console.warn(`⚠️  Session ${sessionId} not found`);
        this.activeSessions.delete(sessionId);
      }
      throw error;
    }
  }

  /**
   * List sessions with filtering
   */
  async listSessions(
    status?: SessionStatus,
    region?: SessionRegion,
    limit: number = 10
  ): Promise<Session[]> {
    const params: SessionListParams = {
      limit,
      ...(status && { status }),
      ...(region && { region }),
    };

    try {
      const response = await this.client.sessions.list(params);

      console.log(
        `📋 Found ${response.total} sessions (showing ${response.sessions.length}):`
      );

      response.sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. ${session.id}`);
        console.log(`      Status: ${session.status}`);
        console.log(`      Region: ${session.region}`);
        console.log(
          `      Created: ${new Date(session.createdAt).toLocaleString()}`
        );
      });

      return response.sessions;
    } catch (error) {
      console.error('❌ Failed to list sessions:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Monitor session status
   */
  async monitorSession(
    sessionId: string,
    intervalMs: number = 5000
  ): Promise<void> {
    console.log(`👀 Monitoring session ${sessionId}...`);

    const monitor = async (): Promise<boolean> => {
      try {
        const isActive = await this.client.sessions.isActive(sessionId);

        if (isActive) {
          const session = await this.getSessionDetails(sessionId);
          console.log(`   Session ${sessionId} is active (${session.status})`);
          return true;
        } else {
          console.log(`   Session ${sessionId} is no longer active`);
          this.activeSessions.delete(sessionId);
          return false;
        }
      } catch (error) {
        console.error(
          `   Error monitoring session: ${(error as Error).message}`
        );
        return false;
      }
    };

    // Initial check
    const isActive = await monitor();
    if (!isActive) return;

    // Set up monitoring interval
    const interval = setInterval(async () => {
      const stillActive = await monitor();
      if (!stillActive) {
        clearInterval(interval);
      }
    }, intervalMs);

    // Clean up after 5 minutes
    setTimeout(
      () => {
        clearInterval(interval);
        console.log(`   Stopped monitoring session ${sessionId}`);
      },
      5 * 60 * 1000
    );
  }

  /**
   * Get connection details for WebSocket connection
   */
  async getConnectionInfo(sessionId: string): Promise<{
    id: string;
    connectionUrl: string;
    status: SessionStatus;
  }> {
    try {
      return await this.client.sessions.getConnection(sessionId);
    } catch (error) {
      console.error(
        `❌ Failed to get connection info: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Get SDK information
   */
  getSDKInfo(): void {
    const info = this.client.getInfo();
    const config = this.client.getConfig();

    console.log('🔧 SDK Information:');
    console.log(`   Version: ${info.version}`);
    console.log(`   User Agent: ${info.userAgent}`);
    console.log(`   Base URL: ${config.baseURL}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   Max Retries: ${config.maxRetries}`);
  }
}

/**
 * Main example function
 */
async function typescriptExample(): Promise<void> {
  const apiKey = process.env.AGENTGO_API_KEY;

  if (!apiKey) {
    throw new Error('AGENTGO_API_KEY environment variable is required');
  }

  const sessionManager = new SessionManager(apiKey);

  try {
    // Display SDK info
    sessionManager.getSDKInfo();
    console.log();

    // Test connection
    await sessionManager.testConnection();
    console.log();

    // Create a new session
    const session = await sessionManager.createSession({
      region: 'US',
      keepAlive: true,
      description: 'TypeScript example session',
    });
    console.log();

    // Wait a moment
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get detailed session information
    await sessionManager.getSessionDetails(session.id);
    console.log();

    // Get connection information
    const connectionInfo = await sessionManager.getConnectionInfo(session.id);
    console.log('🔗 Connection Info:');
    console.log(`   WebSocket URL: ${connectionInfo.connectionUrl}`);
    console.log();

    // List all sessions
    await sessionManager.listSessions();
    console.log();

    // Monitor the session briefly
    console.log('Starting brief monitoring...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n🎉 TypeScript example completed successfully!');
  } catch (error) {
    if (error instanceof AgentGoError) {
      console.error(`❌ AgentGo Error: ${error.message}`);
      console.error(`   Type: ${error.type}`);
      if (error.status) {
        console.error(`   Status: ${error.status}`);
      }
      if (error.details) {
        console.error(`   Details:`, error.details);
      }
    } else {
      console.error('❌ Unexpected error:', (error as Error).message);
    }
    throw error;
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  typescriptExample()
    .then(() => {
      console.log('\nTypeScript example finished successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nTypeScript example failed:', error);
      process.exit(1);
    });
}

export { SessionManager, typescriptExample };
