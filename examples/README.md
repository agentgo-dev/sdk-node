# AgentGo SDK Examples

This directory contains practical examples demonstrating how to use the AgentGo Node.js SDK effectively.

## Prerequisites

Before running any examples, ensure you have:

1. **Node.js 16+** installed
2. **AgentGo API key** - Get one from [AgentGo Dashboard](https://app.agentgo.live)
3. **Environment variable** set: `export AGENTGO_API_KEY=your_api_key_here`

## Available Examples

### 1. Basic Usage (`basic.js`)

**Purpose**: Demonstrates fundamental SDK operations including session creation, listing, and status checking.

**What it covers**:

- Client initialization
- API connection testing
- Creating browser sessions
- Retrieving session details
- Listing sessions with pagination
- Session status monitoring

**Run**:

```bash
node examples/basic.js
```

**Expected output**:

```
Testing API connection...
✅ Successfully connected to AgentGo API

Creating a new browser session...
✅ Session created successfully:
   ID: session-abc123
   Status: RUNNING
   Region: US
   Keep Alive: true
   Connection URL: wss://...
```

### 2. TypeScript Example (`typescript.ts`)

**Purpose**: Showcases TypeScript features including type safety, interfaces, and advanced session management.

**What it covers**:

- Type-safe client configuration
- Custom TypeScript interfaces
- Session lifecycle management
- Resource monitoring
- Error handling with types
- SDK information retrieval

**Run**:

```bash
npx tsx examples/typescript.ts
# or compile first:
npx tsc examples/typescript.ts --target es2020 --module commonjs
node examples/typescript.js
```

**Features demonstrated**:

- `SessionManager` class with typed operations
- Custom `SessionConfig` interface
- Comprehensive error handling
- Session monitoring with intervals
- Resource usage tracking

### 3. Error Handling (`error-handling.js`)

**Purpose**: Comprehensive error handling patterns and retry strategies.

**What it covers**:

- Different error types and their handling
- Retry logic with exponential backoff
- Rate limiting management
- Graceful degradation
- Custom error handler utilities
- Timeout and network error recovery

**Run**:

```bash
node examples/error-handling.js
```

**Error scenarios demonstrated**:

- ❌ Authentication errors (non-retryable)
- ⚠️ Resource not found (graceful degradation)
- ⏱️ Rate limiting (wait and retry)
- 🔄 Network errors (exponential backoff)
- ⏰ Timeout errors (configurable retries)
- 📝 Validation errors (immediate failure)

## Common Patterns

### Client Initialization

```javascript
// Basic initialization
const client = new AgentGo({
  apiKey: 'your_api_key',
});

// With custom configuration
const client = new AgentGo({
  apiKey: process.env.AGENTGO_API_KEY,
  baseURL: 'https://custom.agentgo.live',
  timeout: 60000,
  maxRetries: 5,
});
```

### Session Management

```javascript
// Create a session
const session = await client.sessions.create({
  region: 'US',
  keepAlive: true,
});

// Check if session is active
const isActive = await client.sessions.isActive(session.id);

// Get detailed session information
const details = await client.sessions.retrieve(session.id);

// List sessions with filters
const sessions = await client.sessions.list({
  status: 'RUNNING',
  limit: 10,
});
```

### Error Handling

```javascript
try {
  const session = await client.sessions.create({
    region: 'US',
    keepAlive: true,
  });
} catch (error) {
  if (error instanceof AgentGoError) {
    console.error(`API Error: ${error.type} - ${error.message}`);

    if (error.isRetryable()) {
      const delay = error.getRetryDelay();
      console.log(`Retry after ${delay}ms`);
    }
  }
}
```

## Environment Setup

### Using Environment Variables

Create a `.env` file in your project root:

```bash
AGENTGO_API_KEY=your_api_key_here
```

Then load it in your application:

```javascript
require('dotenv').config();
const { AgentGo } = require('@agentgo-dev/sdk');

const client = new AgentGo(); // Will use AGENTGO_API_KEY automatically
```

### Development vs Production

```javascript
const client = new AgentGo({
  apiKey: process.env.AGENTGO_API_KEY,
  // Use longer timeouts in development
  timeout: process.env.NODE_ENV === 'development' ? 60000 : 30000,
  // More retries in production
  maxRetries: process.env.NODE_ENV === 'production' ? 5 : 3,
});
```

## Best Practices

### 1. Always Handle Errors

```javascript
// ❌ Don't do this
const session = await client.sessions.create({ region: 'US' });

// ✅ Do this
try {
  const session = await client.sessions.create({ region: 'US' });
} catch (error) {
  // Handle error appropriately
}
```

### 2. Use Retry Logic for Transient Errors

```javascript
async function createSessionWithRetry(params, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.sessions.create(params);
    } catch (error) {
      if (
        error instanceof AgentGoError &&
        error.isRetryable() &&
        attempt < maxRetries
      ) {
        const delay = error.getRetryDelay();
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}
```

### 3. Monitor Session Lifecycle

```javascript
const session = await client.sessions.create({ region: 'US' });

// Monitor session status
const checkStatus = async () => {
  const isActive = await client.sessions.isActive(session.id);
  if (!isActive) {
    console.log('Session ended');
    return;
  }
  setTimeout(checkStatus, 5000); // Check every 5 seconds
};

checkStatus();
```

### 4. Clean Up Resources

```javascript
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');

  // Clean up any active sessions if needed
  const sessions = await client.sessions.list({ status: 'RUNNING' });
  for (const session of sessions.sessions) {
    if (session.keepAlive) {
      console.log(`Session ${session.id} will continue running`);
    }
  }

  process.exit(0);
});
```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**

   - Ensure you've installed the package: `npm install @agentgo-dev/sdk`
   - For TypeScript examples: `npm install -D tsx`

2. **Authentication errors**

   - Verify your API key is correct
   - Check that `AGENTGO_API_KEY` environment variable is set
   - Ensure the API key has necessary permissions

3. **Connection timeouts**

   - Increase timeout in client configuration
   - Check your network connection
   - Verify the AgentGo service is accessible

4. **Rate limiting**
   - Implement proper retry logic (see error-handling example)
   - Consider spreading out requests over time
   - Monitor your API usage

### Getting Help

- Check the [main README](../README.md) for detailed API documentation
- Review error messages carefully - they often contain helpful hints
- Use the error handling example as a reference for robust error management

## Contributing

Found an issue or want to improve an example?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests if applicable
5. Submit a pull request

Example improvements welcome:

- Additional error scenarios
- Integration with popular frameworks
- Performance optimization examples
- Advanced session management patterns
