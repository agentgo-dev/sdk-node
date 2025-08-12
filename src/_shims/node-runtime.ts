/**
 * Node.js Runtime Adapter
 * Provides Node.js specific implementations and polyfills
 */

// Check if we're in Node.js environment
export const isNodeJS = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node !== undefined
  );
};

// Get Node.js version
export const getNodeVersion = (): string | null => {
  if (!isNodeJS()) return null;
  return process.versions.node;
};

// Check if Node.js version supports native fetch (18+)
export const hasNativeFetch = (): boolean => {
  if (!isNodeJS()) return false;

  const version = getNodeVersion();
  if (!version) return false;

  const majorVersion = parseInt(version.split('.')[0]!, 10);
  return majorVersion >= 18;
};

/**
 * Get fetch implementation for Node.js
 */
export const getNodeFetch = (): typeof fetch => {
  // Check for native fetch first (Node.js 18+)
  if (
    hasNativeFetch() &&
    typeof globalThis !== 'undefined' &&
    globalThis.fetch
  ) {
    return globalThis.fetch.bind(globalThis);
  }

  // Fall back to cross-fetch for older Node.js versions
  try {
    const crossFetch = require('cross-fetch');
    return crossFetch.default || crossFetch;
  } catch (error) {
    throw new Error(
      'No fetch implementation available. For Node.js < 18, please install cross-fetch: npm install cross-fetch'
    );
  }
};

/**
 * Get Node.js specific headers
 */
export const getNodeHeaders = (): Record<string, string> => {
  const nodeVersion = getNodeVersion();
  return {
    'User-Agent': `agentgo-node/1.0.1 (Node.js ${nodeVersion})`,
  };
};

/**
 * Check if environment variable exists
 */
export const getEnvVar = (name: string): string | undefined => {
  if (!isNodeJS()) return undefined;
  return process.env[name];
};

/**
 * Get platform information
 */
export const getPlatformInfo = () => {
  if (!isNodeJS()) return null;

  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: getNodeVersion(),
    hasNativeFetch: hasNativeFetch(),
  };
};
