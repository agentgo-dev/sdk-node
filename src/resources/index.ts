/**
 * AgentGo API Resources
 * Unified exports for all API resource modules
 */

// Export Sessions resource and types
export { Sessions } from './sessions/sessions';
export type {
  Session,
  SessionStatus,
  SessionRegion,
  SessionCreateParams,
  SessionListParams,
  SessionListResponse,
} from './sessions/sessions';

// Import Sessions for type definition
import { Sessions } from './sessions/sessions';

// Resource types for convenience
export type AgentGoResource = {
  sessions: Sessions;
};

// Re-export base resource class for advanced usage
export { APIResource } from '../resource';
export type { AgentGoClient } from '../resource';
