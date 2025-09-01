const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const PORT = process.env.PORT || 8080;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';

if (!OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
}

// Create WebSocket server
const server = new WebSocket.Server({ 
    port: PORT,
    // Handle CORS for Chrome Extension and development
    verifyClient: (info) => {
        const origin = info.origin;
        console.log(`🔍 Connection attempt from origin: ${origin || 'undefined'}`);

        // Allow Chrome extension origins, localhost, LeetCode domains, and undefined origin (development)
        if (!origin) {
            console.log('✅ Allowing connection without origin (development/direct connection)');
            return true;
        }

        const isAllowed = (
            origin.startsWith('chrome-extension://') ||
            origin.startsWith('moz-extension://') ||
            origin.startsWith('http://localhost') ||
            origin.startsWith('https://localhost') ||
            origin.includes('leetcode.com') ||
            origin.includes('leetcode.cn')
        );

        console.log(`${isAllowed ? '✅' : '❌'} Origin check result: ${isAllowed}`);
        return isAllowed;
    }
});

console.log(`🚀 LeetMentor WebSocket Proxy Server starting on port ${PORT}`);
console.log(`🔑 OpenAI API Key loaded: ${OPENAI_API_KEY.substring(0, 10)}...`);
console.log(`🧠 Realtime model: ${OPENAI_REALTIME_MODEL}`);

// Track active connections
let activeConnections = 0;
let hasActiveVoiceCalls = false;

// Connection deduplication - track by origin
const activeConnectionsByOrigin = new Map();
const CONNECTION_LIMIT_PER_ORIGIN = 3; // Allow a few connections per origin to reduce churn

server.on('connection', (clientWS, request) => {
    activeConnections++;
    const clientId = Math.random().toString(36).substring(7);
    const clientOrigin = request.headers.origin || 'unknown';
    
    console.log(`🔌 New client connected: ${clientId} (Total: ${activeConnections})`);
    console.log(`📍 Client origin: ${clientOrigin}`);
    
    // Check for existing connections from same origin
    if (activeConnectionsByOrigin.has(clientOrigin)) {
        const existingConnections = activeConnectionsByOrigin.get(clientOrigin);
        if (existingConnections.length >= CONNECTION_LIMIT_PER_ORIGIN) {
            console.log(`⚠️  ${clientId}: Closing previous connection from same origin to prevent duplicates`);
            
            // Close the oldest connection
            const oldestConnection = existingConnections.shift();
            if (oldestConnection.ws.readyState === WebSocket.OPEN) {
                oldestConnection.ws.send(JSON.stringify({
                    type: 'connection_status',
                    status: 'replaced',
                    message: 'Connection replaced by newer instance'
                }));
                oldestConnection.ws.close(1000, 'Replaced by newer connection');
            }
        }
        
        // Add this connection to the origin group
        existingConnections.push({ clientId, ws: clientWS });
    } else {
        // First connection from this origin
        activeConnectionsByOrigin.set(clientOrigin, [{ clientId, ws: clientWS }]);
    }
    
    let openaiWS = null;
    let isConnectedToOpenAI = false;
    let upstreamReady = false; // Track if OpenAI session is fully ready
    let messageQueue = [];
    let hasLoggedQueueFull = false; // Track if we've already logged queue full
    const MAX_QUEUE_SIZE = 50; // Prevent memory overflow
    
    // Reconnection backoff state
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const BASE_RECONNECT_DELAY = 1000; // 1 second base delay
    const SERVER_ERROR_DELAY = 10000; // 10 seconds for server errors
    let lastErrorType = null; // Track what kind of error caused the disconnection

    // Connect to OpenAI Realtime API
    const connectToOpenAI = () => {
        console.log(`⚡ ${clientId}: Connecting to OpenAI Realtime API...`);
        
        const model = process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01';
        openaiWS = new WebSocket(`wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`, {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'OpenAI-Beta': 'realtime=v1'
            }
        });

        openaiWS.on('open', () => {
            console.log(`✅ ${clientId}: Connected to OpenAI Realtime API`);
            isConnectedToOpenAI = true;
            
            // Reset reconnection state on successful connection
            reconnectAttempts = 0;
            lastErrorType = null; // Reset error tracking
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }
            
            // Process queued messages
            if (messageQueue.length > 0) {
                console.log(`📦 ${clientId}: Processing ${messageQueue.length} queued messages`);
                messageQueue.forEach(queuedMessage => {
                    if (openaiWS.readyState === WebSocket.OPEN) {
                        openaiWS.send(queuedMessage);
                    }
                });
                messageQueue = []; // Clear queue
                hasLoggedQueueFull = false; // Reset logging flag
            }
            
            // Send connection success to client
            clientWS.send(JSON.stringify({
                type: 'connection_status',
                status: 'connected',
                message: 'Connected to OpenAI Realtime API'
            }));
        });

        openaiWS.on('message', (data) => {
            try {
                // Check if this is a session ready message
                const message = JSON.parse(data);
                console.log(`📨 ${clientId}: OpenAI message: ${message.type}`);
                
                if (message.type === 'session.created') {
                    console.log(`🎯 ${clientId}: OpenAI session created successfully:`, message.session?.id);
                    upstreamReady = true;
                    hasActiveVoiceCalls = true;
                } else if (message.type === 'session.updated') {
                    console.log(`🔄 ${clientId}: OpenAI session updated successfully`);
                } else if (message.type === 'error') {
                    console.error(`❌ ${clientId}: OpenAI sent error:`, message.error);
                    
                    // Track error type for better reconnection strategy
                    if (message.error && message.error.type === 'server_error') {
                        lastErrorType = 'server_error';
                        console.warn(`🚨 ${clientId}: OpenAI server error detected - will use longer retry delay`);
                    } else {
                        lastErrorType = 'other_error';
                    }
                } else if (message.type === 'input_audio_buffer.speech_started') {
                    console.log(`🎤 ${clientId}: Speech detection started`);
                } else if (message.type === 'input_audio_buffer.speech_stopped') {
                    console.log(`🛑 ${clientId}: Speech detection stopped`);
                } else if (message.type === 'response.audio.delta') {
                    // Don't log each audio chunk, just note activity
                    console.log(`🔊 ${clientId}: Audio streaming...`);
                }
            } catch (e) {
                // Binary data (probably audio)
                console.log(`📡 ${clientId}: Received binary data (${data.length} bytes)`);
            }
            
            // Forward OpenAI messages to client
            if (clientWS.readyState === WebSocket.OPEN) {
                clientWS.send(data);
            }
        });

        // Handle ping/pong for connection health
        openaiWS.on('ping', (data) => {
            console.log(`🏓 ${clientId}: Received ping from OpenAI`);
            openaiWS.pong(data); // Respond with same payload
        });

        openaiWS.on('pong', (data) => {
            console.log(`🏓 ${clientId}: Received pong from OpenAI`);
        });

        openaiWS.on('error', (error) => {
            console.error(`❌ ${clientId}: OpenAI WebSocket error:`, error.message);
            
            if (clientWS.readyState === WebSocket.OPEN) {
                clientWS.send(JSON.stringify({
                    type: 'error',
                    error: 'OpenAI connection failed',
                    details: error.message
                }));
            }
        });

        openaiWS.on('close', (code, reason) => {
            const reasonStr = reason.toString();
            console.log(`🔌 ${clientId}: OpenAI connection closed - Code: ${code}, Reason: "${reasonStr}"`);
            
            // Detailed close code analysis
            if (code === 1000) {
                console.log(`⚠️  ${clientId}: Normal closure (1000) - OpenAI ended connection cleanly. This usually means:`);
                console.log(`   - Session configuration issue (turn_detection/transcription)`);
                console.log(`   - Rate limit hit`);
                console.log(`   - Invalid session.update payload`);
            } else if (code === 1005) {
                console.log(`⚠️  ${clientId}: No status code (1005) - Network/transport issue`);
            } else if (code === 1006) {
                console.log(`⚠️  ${clientId}: Abnormal closure (1006) - Connection lost unexpectedly`);
            } else if (code === 1011) {
                console.log(`⚠️  ${clientId}: Server error (1011) - OpenAI internal error`);
            } else {
                console.log(`⚠️  ${clientId}: Unexpected close code: ${code}`);
            }
            
            isConnectedToOpenAI = false;
            upstreamReady = false; // Reset ready state
            messageQueue = []; // Clear queue on disconnect
            hasLoggedQueueFull = false; // Reset logging flag
            hasActiveVoiceCalls = false; // Clear voice call state
            
            // Inform client about disconnection
            if (clientWS.readyState === WebSocket.OPEN) {
                clientWS.send(JSON.stringify({
                    type: 'connection_status',
                    status: 'disconnected',
                    message: `OpenAI disconnected (${code}). Pausing audio capture.`
                }));
                
                // Auto-reconnect with appropriate delay based on error type
                if ((code === 1000 || code === 1005) && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    
                    let delay;
                    if (lastErrorType === 'server_error') {
                        // Use longer delay for server errors (not our fault)
                        delay = Math.min(SERVER_ERROR_DELAY * reconnectAttempts, 60000); // Cap at 1 minute
                        console.log(`🚨 ${clientId}: Server error detected - using extended retry delay`);
                    } else {
                        // Use exponential backoff for configuration/network issues
                        delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000); // Cap at 30 seconds
                    }
                    
                    console.log(`🔄 ${clientId}: Auto-reconnecting to OpenAI (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay}ms...`);
                    
                    reconnectTimer = setTimeout(() => {
                        if (clientWS.readyState === WebSocket.OPEN) {
                            connectToOpenAI();
                        }
                    }, delay);
                } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.warn(`⚠️  ${clientId}: Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Stopping auto-reconnect.`);
                    
                    const errorMessage = lastErrorType === 'server_error' 
                        ? 'OpenAI servers are experiencing issues. Please try again later.'
                        : 'Maximum reconnection attempts reached. Please refresh or restart.';
                    
                    clientWS.send(JSON.stringify({
                        type: 'connection_status',
                        status: 'failed',
                        message: errorMessage
                    }));
                }
            }
        });
    };

    // Handle client messages
    clientWS.on('message', (data, isBinary) => {
        let parsed = null;
        try {
            // Convert Buffer to string for JSON messages
            if (!isBinary) {
                const text = typeof data === 'string' ? data : data.toString();
                parsed = JSON.parse(text);
            }

            if (parsed && parsed.type === 'connect' && !isConnectedToOpenAI) {
                console.log(`📡 ${clientId}: Received connect from client — connecting upstream`);
                connectToOpenAI();
                return;
            }

            if (parsed && parsed.type === 'ping') {
                clientWS.send(JSON.stringify({ type: 'pong' }));
                return;
            }
        } catch (e) {
            // Not JSON, likely binary audio frame
        }

        // Identify audio frames robustly
        const isAudioFrame = (
            isBinary ||
            (parsed && parsed.type === 'input_audio_buffer.append')
        );

        // Forward messages to OpenAI with proper gating
        if (openaiWS && openaiWS.readyState === WebSocket.OPEN && isConnectedToOpenAI) {
            // Gate audio frames until upstream session is ready
            if (isAudioFrame && !upstreamReady) {
                console.log(`🚫 ${clientId}: Dropping audio frame (upstream not ready)`);
                return;
            }
            if (parsed && parsed.type) {
                console.log(`➡️  ${clientId}: Forwarding to OpenAI: ${parsed.type}`);
            }
            const forwardPayload = isBinary ? data : (parsed ? JSON.stringify(parsed) : data);
            openaiWS.send(forwardPayload);
        } else if (!isConnectedToOpenAI) {
            // Only queue non-audio control messages
            if (!isAudioFrame && messageQueue.length < MAX_QUEUE_SIZE) {
                messageQueue.push(data);
                if (messageQueue.length === 1) {
                    console.log(`📦 ${clientId}: Started queuing messages (OpenAI not ready)`);
                }
            } else if (!hasLoggedQueueFull) {
                // Only log once when queue gets full
                console.warn(`⚠️ ${clientId}: Dropping messages (OpenAI not ready)`);
                hasLoggedQueueFull = true;
            }
        }
    });

    // Handle client disconnect
    clientWS.on('close', (code, reason) => {
        activeConnections--;
        console.log(`👋 ${clientId}: Client disconnected (${code}: ${reason}). Active: ${activeConnections}`);
        
        // Remove from origin tracking
        if (activeConnectionsByOrigin.has(clientOrigin)) {
            const connections = activeConnectionsByOrigin.get(clientOrigin);
            const index = connections.findIndex(conn => conn.clientId === clientId);
            if (index !== -1) {
                connections.splice(index, 1);
                console.log(`🧹 ${clientId}: Removed from origin tracking`);
            }
            
            // If no more connections from this origin, remove the entry
            if (connections.length === 0) {
                activeConnectionsByOrigin.delete(clientOrigin);
                console.log(`🧹 Origin ${clientOrigin}: All connections closed`);
            }
        }
        
        // Clean up resources
        messageQueue = [];
        isConnectedToOpenAI = false;
        upstreamReady = false;
        hasLoggedQueueFull = false;
        hasActiveVoiceCalls = false;
        
        // Clear reconnection timer
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        reconnectAttempts = 0;
        
        // Close OpenAI connection
        if (openaiWS && openaiWS.readyState === WebSocket.OPEN) {
            openaiWS.close();
        }
    });

    // Handle client errors
    clientWS.on('error', (error) => {
        console.error(`❌ ${clientId}: Client WebSocket error:`, error.message);
    });

    // Send welcome message
    clientWS.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to LeetMentor Realtime Proxy',
        clientId: clientId
    }));
});

// Server error handling
server.on('error', (error) => {
    console.error('❌ Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    server.close(() => {
        console.log('✅ Server shut down gracefully');
        process.exit(0);
    });
});

console.log('✨ LeetMentor Realtime Proxy Server is ready!');
console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
console.log('🎤 Ready for ChatGPT mobile-level voice conversations!');
