/**
 * Basic AgentGo SDK Usage Example
 * 
 * This example demonstrates the basic functionality of the AgentGo SDK
 * including creating sessions, listing sessions, and checking status.
 */

const { AgentGo } = require('@agentgo-dev/sdk');

async function basicExample() {
    try {
        // Initialize the client with your API key
        const client = new AgentGo({
            apiKey: process.env.AGENTGO_API_KEY || 'your_api_key_here'
        });

        console.log('Testing API connection...');
        await client.testConnection();
        console.log('✅ Successfully connected to AgentGo API\n');

        // Create a new browser session
        console.log('Creating a new browser session...');
        const session = await client.sessions.create({
            region: 'US',
            keepAlive: true
        });

        console.log('✅ Session created successfully:');
        console.log(`   ID: ${session.id}`);
        console.log(`   Status: ${session.status}`);
        console.log(`   Region: ${session.region}`);
        console.log(`   Duration: ${session.duration} seconds`);
        console.log(`   Connection URL: ${session.connectionUrl}`);
        console.log();

        // Wait a moment for the session to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if the session is still active
        console.log('Checking session status...');
        const isActive = await client.sessions.isActive(session.id);
        console.log(`   Session is ${isActive ? 'active' : 'inactive'}`);
        console.log();

        // Retrieve full session details
        console.log('Retrieving session details...');
        const fullSession = await client.sessions.retrieve(session.id);
        console.log('✅ Full session details:');
        console.log(`   ID: ${fullSession.id}`);
        console.log(`   Status: ${fullSession.status}`);
        console.log(`   Created: ${fullSession.createAt}`);
        console.log(`   Updated: ${fullSession.updateAt}`);
        console.log(`   Duration: ${fullSession.duration} seconds`);
        console.log();

        // List all sessions
        console.log('Listing all sessions...');
        const sessionsList = await client.sessions.list({
            limit: 5
        });

        console.log(`✅ Found ${sessionsList.total} total sessions (showing ${sessionsList.sessions.length}):`);
        sessionsList.sessions.forEach((s, index) => {
            console.log(`   ${index + 1}. ${s.id} - ${s.status} (${s.region})`);
        });

        console.log('\n🎉 Basic example completed successfully!');

    } catch (error) {
        console.error('❌ Error occurred:', error.message);
        if (error.type) {
            console.error(`   Error type: ${error.type}`);
        }
        if (error.status) {
            console.error(`   HTTP status: ${error.status}`);
        }
        process.exit(1);
    }
}

// Run the example if this file is executed directly
if (require.main === module) {
    basicExample()
        .then(() => {
            console.log('\nExample finished successfully.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\nExample failed:', error);
            process.exit(1);
        });
}

module.exports = { basicExample }; 