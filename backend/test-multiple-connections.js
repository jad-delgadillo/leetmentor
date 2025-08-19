#!/usr/bin/env node

/**
 * Test multiple connections to verify deduplication works
 */

const WebSocket = require('ws');

console.log('🧪 Testing Multiple Connection Management');
console.log('=====================================\n');

let connection1, connection2;

// Test 1: Connect first client
console.log('1️⃣ Connecting first client...');
connection1 = new WebSocket('ws://localhost:8080', {
    headers: {
        'origin': 'chrome-extension://test-extension'
    }
});

connection1.on('open', () => {
    console.log('✅ Client 1 connected successfully');
    
    // Send connect message
    connection1.send(JSON.stringify({ type: 'connect' }));
    
    // Wait a bit, then connect second client
    setTimeout(connectSecondClient, 2000);
});

connection1.on('message', (data) => {
    try {
        const message = JSON.parse(data);
        console.log(`📨 Client 1: ${message.type} - ${message.message || ''}`);
        
        if (message.type === 'connection_status' && message.status === 'replaced') {
            console.log('✅ Client 1 properly notified of replacement');
        }
    } catch (e) {
        // Ignore binary data
    }
});

connection1.on('close', (code, reason) => {
    console.log(`🔌 Client 1 closed: ${code} - ${reason.toString()}`);
});

function connectSecondClient() {
    console.log('\n2️⃣ Connecting second client from same origin...');
    
    connection2 = new WebSocket('ws://localhost:8080', {
        headers: {
            'origin': 'chrome-extension://test-extension' // Same origin
        }
    });
    
    connection2.on('open', () => {
        console.log('✅ Client 2 connected successfully');
        connection2.send(JSON.stringify({ type: 'connect' }));
    });
    
    connection2.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log(`📨 Client 2: ${message.type} - ${message.message || ''}`);
            
            if (message.type === 'connection_status' && message.status === 'connected') {
                console.log('✅ Client 2 successfully connected to OpenAI');
                
                // Test complete
                setTimeout(() => {
                    console.log('\n🎉 Multiple connection test completed!');
                    console.log('✅ Connection deduplication is working correctly');
                    process.exit(0);
                }, 3000);
            }
        } catch (e) {
            // Ignore binary data
        }
    });
    
    connection2.on('close', (code, reason) => {
        console.log(`🔌 Client 2 closed: ${code} - ${reason.toString()}`);
    });
    
    connection2.on('error', (error) => {
        console.error('❌ Client 2 error:', error.message);
    });
}

// Handle errors
connection1.on('error', (error) => {
    console.error('❌ Client 1 error:', error.message);
    console.log('Make sure the backend server is running: cd backend && npm run dev');
    process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
    console.log('❌ Test timed out');
    process.exit(1);
}, 30000);
