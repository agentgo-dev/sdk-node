/**
 * Web Runtime Adapter
 * Provides browser-specific implementations and Web API compatibility
 */

// Check if we're in a browser environment
export const isBrowser = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof navigator !== 'undefined'
  );
};

// Check if we're in a Web Worker
export const isWebWorker = (): boolean => {
  return (
    typeof self !== 'undefined' &&
    typeof (self as any).importScripts === 'function' &&
    typeof navigator !== 'undefined'
  );
};

// Check if we're in any web environment (browser or web worker)
export const isWebEnvironment = (): boolean => {
  return isBrowser() || isWebWorker();
};

/**
 * Get fetch implementation for web environments
 */
export const getWebFetch = (): typeof fetch => {
  // Try different global objects
  if (typeof fetch !== 'undefined') {
    return fetch.bind(globalThis);
  }

  if (typeof window !== 'undefined' && window.fetch) {
    return window.fetch.bind(window);
  }

  if (typeof self !== 'undefined' && (self as any).fetch) {
    return (self as any).fetch.bind(self);
  }

  throw new Error('Fetch API is not available in this environment');
};

/**
 * Get browser-specific headers
 */
export const getWebHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'User-Agent': 'agentgo-node/1.0.0 (Browser)',
  };

  // Add browser-specific information if available
  if (isBrowser() && navigator.userAgent) {
    headers['X-User-Agent'] = navigator.userAgent;
  }

  return headers;
};

/**
 * Get browser information
 */
export const getBrowserInfo = () => {
  if (!isWebEnvironment()) return null;

  const info: any = {
    isBrowser: isBrowser(),
    isWebWorker: isWebWorker(),
    hasFetch: typeof fetch !== 'undefined',
  };

  if (isBrowser()) {
    info.userAgent = navigator.userAgent;
    info.language = navigator.language;
    info.cookieEnabled = navigator.cookieEnabled;
    info.onLine = navigator.onLine;
  }

  return info;
};

/**
 * Check if a Web API is supported
 */
export const isWebAPISupported = (apiName: string): boolean => {
  if (!isWebEnvironment()) return false;

  const globalObj = isBrowser() ? window : self;
  return typeof (globalObj as any)[apiName] !== 'undefined';
};

/**
 * Get local storage (browser only)
 */
export const getLocalStorage = (): Storage | null => {
  if (!isBrowser()) return null;

  try {
    return window.localStorage;
  } catch (error) {
    // localStorage might be disabled in some environments
    return null;
  }
};

/**
 * Get session storage (browser only)
 */
export const getSessionStorage = (): Storage | null => {
  if (!isBrowser()) return null;

  try {
    return window.sessionStorage;
  } catch (error) {
    // sessionStorage might be disabled in some environments
    return null;
  }
};
