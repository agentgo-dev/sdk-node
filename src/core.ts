/**
 * AgentGo Core HTTP Client
 * Handles all HTTP communication with the AgentGo API
 */

import { fetch } from './_shims/index.js';
import { AgentGoError, type AgentGoErrorResponse } from './error';
import type { AgentGoClient as IAgentGoClient } from './resource';

export interface AgentGoClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Main HTTP client for AgentGo API
 */
export class AgentGoClient implements IAgentGoClient {
  private readonly _apiKey: string;
  private readonly _baseURL: string;
  private readonly _timeout: number;
  private readonly _maxRetries: number;
  private readonly _defaultHeaders: Record<string, string>;

  constructor(options: AgentGoClientOptions = {}) {
    // Get API key from options or environment
    this._apiKey = options.apiKey ?? process.env.AGENTGO_API_KEY ?? '';

    if (!this._apiKey) {
      throw new AgentGoError(
        'UNAUTHORIZED',
        'API key is required. Provide it via constructor options or AGENTGO_API_KEY environment variable.'
      );
    }

    this._baseURL = options.baseURL ?? 'https://session.browsers.live';
    this._timeout = options.timeout ?? 30000; // 30 seconds
    this._maxRetries = options.maxRetries ?? 3;
    this._defaultHeaders = {
      'Content-Type': 'application/json',
      'x-api-key': this._apiKey,
      'User-Agent': 'agentgo-node/1.0.1',
      ...options.defaultHeaders,
    };
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('GET', path, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('POST', path, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('PUT', path, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('PATCH', path, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this._request<T>('DELETE', path, options);
  }

  /**
   * Core request method with retry logic
   */
  private async _request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const maxRetries = options.retries ?? this._maxRetries;
    let lastError: AgentGoError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this._makeRequest<T>(method, path, options);
      } catch (error) {
        lastError =
          error instanceof AgentGoError
            ? error
            : AgentGoError.networkError(String(error));

        // Don't retry on final attempt or non-retryable errors
        if (attempt === maxRetries || !lastError.isRetryable()) {
          throw lastError;
        }

        // Wait before retrying
        const delay = this._getRetryDelay(attempt, lastError);
        await this._sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make a single HTTP request
   */
  private async _makeRequest<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = this._buildURL(path, options.query);
    const timeout = options.timeout ?? this._timeout;

    const headers = {
      ...this._defaultHeaders,
      ...options.headers,
    };

    const body = options.body ? JSON.stringify(options.body) : undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        fetchOptions.body = body;
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      return await this._handleResponse<T>(response);
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw AgentGoError.timeoutError(`Request timed out after ${timeout}ms`);
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw AgentGoError.networkError(
        `Network request failed: ${errorMessage}`
      );
    }
  }

  /**
   * Handle HTTP response
   */
  private async _handleResponse<T>(response: Response): Promise<T> {
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let errorBody: AgentGoErrorResponse | undefined;

      if (isJson) {
        try {
          errorBody = await response.json();
        } catch {
          // Ignore JSON parsing errors for error responses
        }
      }

      throw AgentGoError.fromResponse(response, errorBody);
    }

    if (isJson) {
      return response.json();
    }

    // For non-JSON responses, return the text as unknown (will be cast to T)
    return response.text() as unknown as T;
  }

  /**
   * Build full URL with query parameters
   */
  private _buildURL(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): string {
    const url = new URL(
      path.startsWith('/') ? path : `/${path}`,
      this._baseURL
    );

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    return url.toString();
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private _getRetryDelay(attempt: number, error: AgentGoError): number {
    // Use error-specific delay if available
    const errorDelay = error.getRetryDelay();

    // Apply exponential backoff: base delay * 2^attempt
    const exponentialDelay = errorDelay * Math.pow(2, attempt);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // 0-1000ms

    return Math.min(exponentialDelay + jitter, 60000); // Max 60 seconds
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get client configuration
   */
  public getConfig(): Readonly<{
    baseURL: string;
    timeout: number;
    maxRetries: number;
  }> {
    return Object.freeze({
      baseURL: this._baseURL,
      timeout: this._timeout,
      maxRetries: this._maxRetries,
    });
  }
}
