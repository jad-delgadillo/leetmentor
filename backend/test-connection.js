#!/usr/bin/env node

/**
 * Simple connection test for LeetMentor Realtime Voice Server
 * This script tests the connection stability and logs the flow
 */

const WebSocket = require('ws');
require('dotenv').config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
}

console.log('🧪 LeetMentor Realtime Connection Test');
console.log('=====================================\n');

// Test direct connection to OpenAI first
console.log('1️⃣ Testing direct connection to OpenAI Realtime API...');

const testDirectConnection = () => {
    const ws = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01', {
        headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
        }
    });

    let sessionCreated = false;
    let sessionUpdated = false;

    const timeout = setTimeout(() => {
        console.log('❌ Direct connection test timed out');
        ws.close();
        testProxyConnection();
    }, 15000);

    ws.on('open', () => {
        console.log('✅ Direct connection to OpenAI established');
        
        // Send minimal session update
        const minimalConfig = {
            type: 'session.update',
            session: {
                modalities: ['text', 'audio'],
                instructions: 'You are a test assistant.'
            }
        };
        
        console.log('📤 Sending minimal session configuration...');
        ws.send(JSON.stringify(minimalConfig));
    });

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log(`📨 Received: ${message.type}`);
            
            if (message.type === 'session.created') {
                sessionCreated = true;
                console.log('✅ Session created successfully');
            }
            
            if (message.type === 'session.updated') {
                sessionUpdated = true;
                console.log('✅ Session updated successfully');
                
                // If we get this far, the connection is stable
                setTimeout(() => {
                    console.log('🎉 Direct connection test PASSED - No immediate 1000 closure!\n');
                    clearTimeout(timeout);
                    ws.close();
                    testProxyConnection();
                }, 2000);
            }
            
            if (message.type === 'error') {
                console.error('❌ OpenAI error:', message.error);
                clearTimeout(timeout);
                ws.close();
                testProxyConnection();
            }
            
        } catch (e) {
            // Binary data, ignore for test
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`🔌 Direct connection closed: ${code} - ${reason.toString()}`);
        if (!sessionUpdated && (code === 1000 || code === 1005)) {
            console.log('❌ Connection closed before session.updated - this indicates the original issue!');
        }
        clearTimeout(timeout);
        if (!sessionUpdated) {
            testProxyConnection();
        }
    });

    ws.on('error', (error) => {
        console.error('❌ Direct connection error:', error.message);
        clearTimeout(timeout);
        testProxyConnection();
    });
};

// Test connection through our proxy server
const testProxyConnection = () => {
    console.log('2️⃣ Testing connection through LeetMentor proxy server...');
    console.log('   (Make sure your server is running: cd backend && npm run dev)\n');

    const proxyWs = new WebSocket('ws://localhost:8080');
    let proxyConnected = false;

    const timeout = setTimeout(() => {
        console.log('❌ Proxy connection test timed out');
        console.log('   Make sure the backend server is running on port 8080');
        proxyWs.close();
        process.exit(1);
    }, 10000);

    proxyWs.on('open', () => {
        console.log('✅ Connected to LeetMentor proxy');
        // Send connect message to trigger OpenAI connection
        proxyWs.send(JSON.stringify({ type: 'connect' }));
    });

    proxyWs.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            console.log(`📨 Proxy message: ${message.type}`);
            
            if (message.type === 'connection_status' && message.status === 'connected') {
                console.log('✅ Proxy successfully connected to OpenAI');
                proxyConnected = true;
                
                setTimeout(() => {
                    console.log('🎉 Proxy connection test PASSED!\n');
                    console.log('✨ All tests completed successfully!');
                    console.log('🚀 Your realtime voice feature should now work without reconnection loops.');
                    clearTimeout(timeout);
                    proxyWs.close();
                    process.exit(0);
                }, 3000);
            }
            
            if (message.type === 'connection_status' && message.status === 'failed') {
                console.error('❌ Proxy connection failed permanently:', message.message);
                clearTimeout(timeout);
                proxyWs.close();
                process.exit(1);
            }
            
        } catch (e) {
            // Ignore binary data
        }
    });

    proxyWs.on('close', (code, reason) => {
        console.log(`🔌 Proxy connection closed: ${code} - ${reason.toString()}`);
        clearTimeout(timeout);
        if (!proxyConnected) {
            console.log('❌ Proxy connection failed - check if backend server is running');
            process.exit(1);
        }
    });

    proxyWs.on('error', (error) => {
        console.error('❌ Proxy connection error:', error.message);
        console.log('   Make sure the backend server is running: cd backend && npm run dev');
        clearTimeout(timeout);
        process.exit(1);
    });
};

// Start the tests
testDirectConnection();
