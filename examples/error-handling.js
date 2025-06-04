/**
 * Error Handling Example for AgentGo SDK
 * 
 * This example demonstrates comprehensive error handling patterns
 * including retry logic, error types, and graceful degradation.
 */

const { AgentGo, AgentGoError } = require('agentgo-node');

/**
 * Custom error handler utility
 */
class ErrorHandler {
    constructor() {
        this.retryAttempts = new Map();
    }

    /**
     * Handle different types of AgentGo errors
     */
    async handleError(error, operation, context = {}) {
        if (!(error instanceof AgentGoError)) {
            console.error('❌ Unexpected error:', error.message);
            throw error;
        }

        console.error(`❌ ${operation} failed: ${error.message}`);
        console.error(`   Error Type: ${error.type}`);

        if (error.status) {
            console.error(`   HTTP Status: ${error.status}`);
        }

        if (error.details) {
            console.error(`   Details:`, JSON.stringify(error.details, null, 2));
        }

        // Handle specific error types
        switch (error.type) {
            case 'UNAUTHORIZED':
                console.error('🔑 Authentication failed. Please check your API key.');
                console.error('   Hint: Set AGENTGO_API_KEY environment variable or pass apiKey option');
                throw error; // Don't retry auth errors

            case 'RATE_LIMIT_EXCEEDED':
                return this.handleRateLimit(error, operation, context);

            case 'SESSION_NOT_FOUND':
                console.warn('⚠️  Session not found. It may have been deleted or expired.');
                return null; // Graceful degradation

            case 'INVALID_REQUEST':
                console.error('📝 Request validation failed. Please check your parameters.');
                if (error.details) {
                    console.error('   Invalid fields:', Object.keys(error.details));
                }
                throw error; // Don't retry validation errors

            case 'INTERNAL_SERVER_ERROR':
            case 'NETWORK_ERROR':
            case 'TIMEOUT_ERROR':
                return this.handleRetryableError(error, operation, context);

            default:
                console.error('❓ Unknown error type. Treating as non-retryable.');
                throw error;
        }
    }

    /**
     * Handle rate limiting with exponential backoff
     */
    async handleRateLimit(error, operation, context) {
        const retryAfter = error.retryAfter || 60; // seconds
        const delay = retryAfter * 1000; // convert to milliseconds

        console.warn(`⏱️  Rate limited. Waiting ${retryAfter} seconds before retry...`);

        // Show countdown
        for (let i = retryAfter; i > 0; i--) {
            process.stdout.write(`\r   Retrying in ${i} seconds...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        console.log('\n   Retrying now...');

        return { shouldRetry: true, delay: 0 }; // Already waited
    }

    /**
     * Handle retryable errors with exponential backoff
     */
    async handleRetryableError(error, operation, context) {
        const maxRetries = context.maxRetries || 3;
        const currentAttempt = this.retryAttempts.get(operation) || 0;

        if (currentAttempt >= maxRetries) {
            console.error(`💥 Max retries (${maxRetries}) exceeded for ${operation}`);
            throw error;
        }

        const nextAttempt = currentAttempt + 1;
        this.retryAttempts.set(operation, nextAttempt);

        // Exponential backoff: 1s, 2s, 4s, 8s, etc.
        const baseDelay = 1000;
        const delay = Math.min(baseDelay * Math.pow(2, currentAttempt), 30000); // max 30s

        console.warn(`🔄 Retry attempt ${nextAttempt}/${maxRetries} in ${delay / 1000}s...`);

        return { shouldRetry: true, delay };
    }

    /**
     * Reset retry counter for an operation
     */
    resetRetries(operation) {
        this.retryAttempts.delete(operation);
    }
}

/**
 * Retry wrapper with error handling
 */
async function withRetry(operation, operationName, errorHandler, context = {}) {
    let lastError;

    while (true) {
        try {
            const result = await operation();
            errorHandler.resetRetries(operationName);
            return result;
        } catch (error) {
            lastError = error;

            try {
                const retryInfo = await errorHandler.handleError(error, operationName, context);

                if (!retryInfo || !retryInfo.shouldRetry) {
                    throw error;
                }

                if (retryInfo.delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, retryInfo.delay));
                }
            } catch (handlerError) {
                throw handlerError;
            }
        }
    }
}

/**
 * Example demonstrating various error scenarios
 */
async function errorHandlingExample() {
    const errorHandler = new ErrorHandler();

    console.log('🚨 AgentGo SDK Error Handling Example\n');

    // Example 1: Authentication Error
    console.log('1️⃣  Testing authentication error...');
    try {
        const invalidClient = new AgentGo({ apiKey: 'invalid_key' });
        await invalidClient.testConnection();
    } catch (error) {
        await errorHandler.handleError(error, 'authentication test');
    }
    console.log();

    // Example 2: Valid client for further tests
    const apiKey = process.env.AGENTGO_API_KEY;
    if (!apiKey) {
        console.error('❌ AGENTGO_API_KEY environment variable is required for this example');
        return;
    }

    const client = new AgentGo({ apiKey });

    // Example 3: Session Not Found Error
    console.log('2️⃣  Testing session not found error...');
    try {
        const result = await withRetry(
            () => client.sessions.retrieve('non-existent-session'),
            'retrieve non-existent session',
            errorHandler
        );
        console.log('Result:', result);
    } catch (error) {
        console.log('   Operation failed permanently');
    }
    console.log();

    // Example 4: Create session with retry logic
    console.log('3️⃣  Creating session with retry logic...');
    try {
        const session = await withRetry(
            () => client.sessions.create({
                region: 'US',
                keepAlive: true
            }),
            'create session',
            errorHandler,
            { maxRetries: 3 }
        );

        console.log('✅ Session created successfully:', session.id);

        // Example 5: Test with created session
        console.log('\n4️⃣  Testing session operations...');

        // This should work
        const sessionDetails = await withRetry(
            () => client.sessions.retrieve(session.id),
            'retrieve session',
            errorHandler
        );
        console.log('✅ Retrieved session details successfully');

        // Test connection status
        const isActive = await withRetry(
            () => client.sessions.isActive(session.id),
            'check session status',
            errorHandler
        );
        console.log(`✅ Session is ${isActive ? 'active' : 'inactive'}`);

    } catch (error) {
        console.error('❌ Session operations failed:', error.message);
    }

    // Example 6: Simulate network timeout
    console.log('\n5️⃣  Testing timeout handling...');
    try {
        const timeoutClient = new AgentGo({
            apiKey,
            timeout: 1 // Very short timeout to trigger error
        });

        await withRetry(
            () => timeoutClient.sessions.list(),
            'list sessions with timeout',
            errorHandler,
            { maxRetries: 2 }
        );
    } catch (error) {
        console.log('   Timeout operation handled');
    }

    // Example 7: Invalid request parameters
    console.log('\n6️⃣  Testing invalid request parameters...');
    try {
        // This might cause validation errors depending on API
        await withRetry(
            () => client.sessions.create({
                region: 'INVALID_REGION',
                keepAlive: true
            }),
            'create session with invalid params',
            errorHandler
        );
    } catch (error) {
        console.log('   Invalid parameter error handled');
    }

    console.log('\n🎉 Error handling example completed!');
    console.log('\n📋 Summary of demonstrated error handling patterns:');
    console.log('   ✓ Authentication errors (non-retryable)');
    console.log('   ✓ Resource not found (graceful degradation)');
    console.log('   ✓ Rate limiting (wait and retry)');
    console.log('   ✓ Network errors (exponential backoff)');
    console.log('   ✓ Timeout errors (configurable retries)');
    console.log('   ✓ Validation errors (immediate failure)');
}

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown() {
    const shutdown = (signal) => {
        console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
        process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Run the example if this file is executed directly
if (require.main === module) {
    setupGracefulShutdown();

    errorHandlingExample()
        .then(() => {
            console.log('\nError handling example finished successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nError handling example failed:', error);
            process.exit(1);
        });
}

module.exports = {
    ErrorHandler,
    withRetry,
    errorHandlingExample
}; 