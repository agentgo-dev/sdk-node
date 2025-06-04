/**
 * Base API Resource Class
 * Provides common functionality for all AgentGo API resources
 */

// Forward declaration to avoid circular dependency
export interface AgentGoClient {
  get<T>(
    path: string,
    options?: { query?: Record<string, string | number | boolean | undefined> }
  ): Promise<T>;
  post<T>(
    path: string,
    options?: { body?: Record<string, unknown> }
  ): Promise<T>;
  put<T>(
    path: string,
    options?: { body?: Record<string, unknown> }
  ): Promise<T>;
  patch<T>(
    path: string,
    options?: { body?: Record<string, unknown> }
  ): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export abstract class APIResource {
  protected readonly _client: AgentGoClient;

  constructor(client: AgentGoClient) {
    this._client = client;
  }

  /**
   * Make a GET request
   */
  protected async _get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const options = query !== undefined ? { query } : undefined;
    return this._client.get<T>(path, options);
  }

  /**
   * Make a POST request
   */
  protected async _post<T>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const options = body !== undefined ? { body } : undefined;
    return this._client.post<T>(path, options);
  }

  /**
   * Make a PUT request
   */
  protected async _put<T>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const options = body !== undefined ? { body } : undefined;
    return this._client.put<T>(path, options);
  }

  /**
   * Make a PATCH request
   */
  protected async _patch<T>(
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const options = body !== undefined ? { body } : undefined;
    return this._client.patch<T>(path, options);
  }

  /**
   * Make a DELETE request
   */
  protected async _delete<T>(path: string): Promise<T> {
    return this._client.delete<T>(path);
  }

  /**
   * Build query string from parameters
   */
  protected _buildQuery(
    params?: Record<string, string | number | boolean | undefined>
  ): string {
    if (!params) return '';

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Validate required parameters
   */
  protected _validateRequired<T extends Record<string, unknown>>(
    params: T,
    required: (keyof T)[]
  ): void {
    const missing = required.filter(
      (key) =>
        params[key] === undefined || params[key] === null || params[key] === ''
    );

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }
  }

  /**
   * Clean undefined values from object
   */
  protected _cleanParams<T extends Record<string, unknown>>(
    params: T
  ): Partial<T> {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }

    return cleaned as Partial<T>;
  }
}
