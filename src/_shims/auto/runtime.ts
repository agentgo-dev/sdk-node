/**
 * Automatic Runtime Detection
 * Detects the current JavaScript runtime and loads appropriate adapters
 */

import {
  isNodeJS,
  getNodeFetch,
  getNodeHeaders,
  getPlatformInfo,
} from '../node-runtime';
import {
  isWebEnvironment,
  getWebFetch,
  getWebHeaders,
  getBrowserInfo,
} from '../web-runtime';

export type RuntimeType = 'node' | 'browser' | 'web-worker' | 'unknown';

/**
 * Detect the current runtime environment
 */
export const detectRuntime = (): RuntimeType => {
  if (isNodeJS()) {
    return 'node';
  }

  if (isWebEnvironment()) {
    if (typeof window !== 'undefined') {
      return 'browser';
    } else {
      return 'web-worker';
    }
  }

  return 'unknown';
};

/**
 * Get the appropriate fetch implementation for the current environment
 */
export const getAutoFetch = (): typeof fetch => {
  const runtime = detectRuntime();

  switch (runtime) {
    case 'node':
      return getNodeFetch();
    case 'browser':
    case 'web-worker':
      return getWebFetch();
    default:
      throw new Error(`Unsupported runtime environment: ${runtime}`);
  }
};

/**
 * Get environment-specific headers
 */
export const getAutoHeaders = (): Record<string, string> => {
  const runtime = detectRuntime();

  switch (runtime) {
    case 'node':
      return getNodeHeaders();
    case 'browser':
    case 'web-worker':
      return getWebHeaders();
    default:
      return {
        'User-Agent': `agentgo-node/1.0.0 (${runtime})`,
      };
  }
};

/**
 * Get comprehensive runtime information
 */
export const getRuntimeInfo = () => {
  const runtime = detectRuntime();

  const baseInfo = {
    runtime,
    timestamp: new Date().toISOString(),
  };

  switch (runtime) {
    case 'node':
      return {
        ...baseInfo,
        platform: getPlatformInfo(),
      };
    case 'browser':
    case 'web-worker':
      return {
        ...baseInfo,
        browser: getBrowserInfo(),
      };
    default:
      return baseInfo;
  }
};

/**
 * Check if a specific feature is available in the current environment
 */
export const isFeatureAvailable = (feature: string): boolean => {
  const runtime = detectRuntime();

  switch (feature) {
    case 'fetch':
      try {
        getAutoFetch();
        return true;
      } catch {
        return false;
      }
    case 'localStorage':
      return runtime === 'browser' && typeof localStorage !== 'undefined';
    case 'process':
      return runtime === 'node' && typeof process !== 'undefined';
    case 'navigator':
      return (
        (runtime === 'browser' || runtime === 'web-worker') &&
        typeof navigator !== 'undefined'
      );
    default:
      return false;
  }
};
