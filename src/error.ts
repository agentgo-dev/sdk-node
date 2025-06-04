/**
 * AgentGo SDK Error Types and Exception Handling
 */

export type AgentGoErrorType =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'SESSION_NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export interface AgentGoErrorDetails {
  field?: string;
  issue?: string;
  [key: string]: unknown;
}

export interface AgentGoErrorResponse {
  error: AgentGoErrorType;
  message: string;
  details?: AgentGoErrorDetails;
  retryAfter?: number;
}

/**
 * Base error class for all AgentGo SDK errors
 */
export class AgentGoError extends Error {
  public readonly name = 'AgentGoError';
  public readonly type: AgentGoErrorType;
  public readonly status?: number;
  public readonly details?: AgentGoErrorDetails;
  public readonly retryAfter?: number;

  constructor(
    type: AgentGoErrorType,
    message: string,
    status?: number,
    details?: AgentGoErrorDetails,
    retryAfter?: number
  ) {
    super(message);
    this.type = type;

    if (status !== undefined) {
      this.status = status;
    }
    if (details !== undefined) {
      this.details = details;
    }
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AgentGoError.prototype);
  }

  /**
   * Create AgentGoError from HTTP response
   */
  static fromResponse(
    response: Response,
    responseBody?: AgentGoErrorResponse
  ): AgentGoError {
    const status = response.status;

    if (responseBody?.error) {
      return new AgentGoError(
        responseBody.error,
        responseBody.message,
        status,
        responseBody.details,
        responseBody.retryAfter
      );
    }

    // Map HTTP status codes to error types
    let errorType: AgentGoErrorType;
    let message: string;

    switch (status) {
      case 400:
        errorType = 'INVALID_REQUEST';
        message = 'Invalid request parameters';
        break;
      case 401:
        errorType = 'UNAUTHORIZED';
        message = 'Invalid or missing API key';
        break;
      case 404:
        errorType = 'SESSION_NOT_FOUND';
        message = 'Resource not found';
        break;
      case 429:
        errorType = 'RATE_LIMIT_EXCEEDED';
        message = 'API rate limit exceeded';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = 'INTERNAL_SERVER_ERROR';
        message = 'Internal server error';
        break;
      default:
        errorType = 'UNKNOWN_ERROR';
        message = `HTTP ${status}: ${response.statusText}`;
    }

    return new AgentGoError(errorType, message, status);
  }

  /**
   * Create network error
   */
  static networkError(message: string): AgentGoError {
    return new AgentGoError('NETWORK_ERROR', message);
  }

  /**
   * Create timeout error
   */
  static timeoutError(message: string): AgentGoError {
    return new AgentGoError('TIMEOUT_ERROR', message);
  }

  /**
   * Check if error is retryable
   */
  public isRetryable(): boolean {
    return (
      this.type === 'RATE_LIMIT_EXCEEDED' ||
      this.type === 'INTERNAL_SERVER_ERROR' ||
      this.type === 'NETWORK_ERROR' ||
      this.type === 'TIMEOUT_ERROR'
    );
  }

  /**
   * Get retry delay in milliseconds
   */
  public getRetryDelay(): number {
    if (this.retryAfter) {
      return this.retryAfter * 1000; // Convert seconds to milliseconds
    }

    // Default retry delays based on error type
    switch (this.type) {
      case 'RATE_LIMIT_EXCEEDED':
        return 60000; // 1 minute
      case 'INTERNAL_SERVER_ERROR':
        return 5000; // 5 seconds
      case 'NETWORK_ERROR':
        return 1000; // 1 second
      case 'TIMEOUT_ERROR':
        return 2000; // 2 seconds
      default:
        return 1000; // 1 second
    }
  }

  /**
   * Convert error to JSON representation
   */
  public toJSON(): AgentGoErrorResponse {
    const result: AgentGoErrorResponse = {
      error: this.type,
      message: this.message,
    };

    if (this.details !== undefined) {
      result.details = this.details;
    }
    if (this.retryAfter !== undefined) {
      result.retryAfter = this.retryAfter;
    }

    return result;
  }
}
