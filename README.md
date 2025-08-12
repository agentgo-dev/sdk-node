# AgentGo Node.js SDK

A powerful Node.js SDK for the AgentGo headless browser automation platform. Easily manage browser sessions and automate web interactions with a simple, intuitive API.

## Features

- 🚀 Simple and intuitive API
- 📦 TypeScript support with full type definitions
- 🌍 Cross-platform compatibility (Node.js, browsers)
- 🔄 Built-in retry logic and error handling
- 📊 Session management and monitoring
- 🔐 Secure API key authentication

## Installation

```bash
npm i @agentgo-dev/sdk
```

## Quick Start

### Basic Usage

```typescript
import { AgentGo } from '@agentgo-dev/sdk';

const client = new AgentGo({
  apiKey: 'your_api_key_here',
});

async function example() {
  // Create a new browser session
  const session = await client.sessions.create({
    region: 'US',
    keepAlive: true,
  });

  console.log('Session created:', session.id);
  console.log('Connection URL:', session.connectionUrl);

  // List all sessions
  const sessions = await client.sessions.list({
    status: 'IDLE',
    limit: 10,
  });

  console.log('Active sessions:', sessions.sessions.length);

  // Get session details
  const sessionDetails = await client.sessions.retrieve(session.id);
  console.log('Session status:', sessionDetails.status);
}

example().catch(console.error);
```

### JavaScript (CommonJS)

```javascript
const { AgentGo } = require('@agentgo-dev/sdk');

const client = new AgentGo({
  apiKey: 'your_api_key_here',
});

client.sessions
  .create({
    region: 'US',
    keepAlive: true,
  })
  .then((session) => {
    console.log('Session created:', session.id);
  })
  .catch(console.error);
```

## Configuration

### Authentication

You can provide your API key in several ways:

```typescript
// 1. Constructor option
const client = new AgentGo({
  apiKey: 'your_api_key_here',
});

// 2. Environment variable
// Set AGENTGO_API_KEY=your_api_key_here
const client = new AgentGo();

// 3. Configuration object
const client = new AgentGo({
  apiKey: 'your_api_key_here',
  baseURL: 'https://session.browsers.live', // optional
  timeout: 30000, // optional
  maxRetries: 3, // optional
});
```

## API Reference

### Sessions

#### Create Session

```typescript
const session = await client.sessions.create({
  region?: 'US',           // Geographic region
  keepAlive?: true         // Prevent 30-second timeout
});
```

#### List Sessions

```typescript
const sessions = await client.sessions.list({
  status?: 'IDLE',         // Filter by status (IDLE/RUNNING/EXPIRED)
  region?: 'US',           // Filter by region
  limit?: 20,              // Max results (1-100)
});
```

#### Retrieve Session

```typescript
const session = await client.sessions.retrieve('session-id');
```

## Error Handling

The SDK provides structured error handling:

```typescript
import { AgentGo, AgentGoError } from '@agentgo-dev/sdk';

try {
  const session = await client.sessions.create({
    region: 'INVALID_REGION',
  });
} catch (error) {
  if (error instanceof AgentGoError) {
    console.log('Error type:', error.type);
    console.log('Error message:', error.message);
    console.log('Status code:', error.status);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { AgentGo, Session, SessionCreateParams } from '@agentgo-dev/sdk';

const client = new AgentGo({ apiKey: 'your_api_key_here' });

const params: SessionCreateParams = {
  region: 'US',
  keepAlive: true,
};

const session: Session = await client.sessions.create(params);
```

## Requirements

- Node.js 16.0.0 or higher
- Valid AgentGo API key

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build

# Watch mode
npm run build:watch
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@agentgo.live
- 📚 Documentation: [AgentGo Docs](https://docs.agentgo.live)
- 🐛 Issues: [GitHub Issues](https://github.com/agentgo-dev/sdk-node/issues)
