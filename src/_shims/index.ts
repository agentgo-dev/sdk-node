/**
 * Platform shims for cross-environment compatibility
 * Provides unified APIs for Node.js, browsers, and other JS runtimes
 */

export * from './node-runtime';
export * from './web-runtime';
export * from './auto/runtime';

import {
  getAutoFetch,
  getAutoHeaders,
  detectRuntime,
  getRuntimeInfo,
} from './auto/runtime';

// Export the automatically detected fetch implementation
export const fetch = getAutoFetch();

// Export environment-specific headers
export const defaultHeaders = getAutoHeaders();

// Export runtime detection utilities
export const runtime = detectRuntime();
export const runtimeInfo = getRuntimeInfo();

// Convenience function to get all shims
export const getShims = () => ({
  fetch: getAutoFetch(),
  headers: getAutoHeaders(),
  runtime: detectRuntime(),
  info: getRuntimeInfo(),
});
