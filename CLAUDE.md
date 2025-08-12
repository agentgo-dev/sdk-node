# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Build and Development
- `npm run build` - Build the TypeScript project (uses tsc + tsc-multi for dual output)
- `npm run build:watch` - Build in watch mode for development
- `npm run clean` - Remove dist directory

### Testing
- `npm test` - Run Jest tests located in tests/
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage reports
- `npm test tests/error.test.ts` - Run specific test file (error handling)
- `npm test tests/sessions.test.ts` - Run specific test file (sessions API)
- `npm test tests/integration.test.ts` - Run integration tests (requires real API key)

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check Prettier formatting

### Publishing
- `npm run prepublishOnly` - Full build pipeline (clean, build, test specific files)

## Architecture Overview

This is the Node.js SDK for AgentGo, a headless browser automation platform. The SDK provides a TypeScript-first client for managing browser sessions.

### Core Components

**AgentGo Class** (`src/index.ts`): Main SDK entry point that orchestrates the HTTP client and resource APIs.

**AgentGoClient** (`src/core.ts`): HTTP client with built-in retry logic, timeout handling, and error management. Supports exponential backoff with jitter.

**Sessions API** (`src/resources/sessions/sessions.ts`): Resource class for browser session management (create, list, retrieve operations).

**Error Handling** (`src/error.ts`): Structured error types with retry logic and API-specific error responses.

**Cross-Platform Support** (`src/_shims/`): Runtime abstraction layer for Node.js/browser compatibility.

### Key Patterns

- **Resource Pattern**: API endpoints are organized as resource classes that extend APIResource
- **Error-First Design**: All operations use structured AgentGoError with retry capability detection
- **Environment Configuration**: API keys via constructor or AGENTGO_API_KEY environment variable
- **Dual Module Support**: Outputs both CommonJS and ESM via tsc-multi

### Authentication & Configuration

API authentication uses `x-api-key` header. Default base URL is `https://session.browsers.live`. The client supports configurable timeout (30s default) and retry logic (3 attempts default).

### API Changes from Original Design

- **Session Status**: Only supports 3 states: `IDLE`, `RUNNING`, `EXPIRED` (removed COMPLETED, FAILED)
- **Response Fields**: Uses `createAt`/`updateAt` instead of `createdAt`/`updatedAt`
- **Removed Fields**: No `playgroundId`, `timeout`, `maxPages`, `metadata`, `resourceUsage` in responses
- **Simplified Structure**: Focus on core session management with WebSocket connection URLs

### Testing Setup

Jest with ts-jest preset. Tests exclude shims from coverage. Setup file at `tests/setup.ts`. Test timeout set to 10 seconds. Integration tests require real API key via `AGENTGO_API_KEY` environment variable and will be skipped if not provided.

### Development Workflow

The SDK uses TypeScript with dual module output (CommonJS + ESM) via tsc-multi. The entry point orchestrates HTTP client initialization and resource API binding. All API operations flow through the AgentGoClient with built-in retry logic and structured error handling.