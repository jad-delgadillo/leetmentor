# 🚀 LeetMentor Realtime Backend Proxy

WebSocket proxy server that enables **ChatGPT mobile-level voice conversations** in the LeetMentor Chrome extension.

## ⚡ What This Does

- **Proxies WebSocket connections** from Chrome extension to OpenAI Realtime API
- **Handles authentication** (keeps your API key secure on server)
- **Enables real-time voice streaming** with sub-second latency
- **Supports voice activity detection** and natural conversation flow

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
# Copy template and add your API key
cp env.template .env

# Edit .env and add your OpenAI API key
# OPENAI_API_KEY=sk-proj-your-actual-key-here
```

### 3. Start Server
```bash
# Development (with auto-restart)
npm run dev

# Or production mode
npm start
```

### 4. Test Connection
```bash
# Server should show:
# 🚀 LeetMentor WebSocket Proxy Server starting on port 8080
# ✨ LeetMentor Realtime Proxy Server is ready!
# 📡 WebSocket endpoint: ws://localhost:8080
```

### 5. Use with Chrome Extension
1. Toggle **Realtime** mode in the extension
2. Extension will connect to `ws://localhost:8080`
3. Enjoy ChatGPT mobile-level voice experience! 🎤

---

## 🌐 Production Deployment

### Option 1: Railway.app (Recommended)
```bash
# 1. Create Railway account
# 2. Connect GitHub repo
# 3. Deploy automatically
# 4. Add OPENAI_API_KEY environment variable
# 5. Update extension proxy URL
```

### Option 2: Render.com
```bash
# 1. Create Render account
# 2. Connect GitHub repo  
# 3. Deploy as Web Service
# 4. Add OPENAI_API_KEY environment variable
```

### Option 3: Vercel (Serverless)
```bash
# Coming soon - WebSocket support in development
```

---

## 🔧 Configuration

### Environment Variables
```bash
OPENAI_API_KEY=sk-proj-...     # Required: Your OpenAI API key
PORT=8080                      # Optional: Server port (default 8080)
```

### Chrome Extension Setup
Update `src/shared/realtime-voice-service.ts`:
```javascript
private getProxyUrl(): string {
  // For production deployment
  return 'wss://your-app-name.railway.app'; 
}
```

---

## 🎯 Features

### ✅ Current
- **WebSocket Proxy**: Chrome Extension ↔ This Server ↔ OpenAI
- **CORS Handling**: Supports Chrome extension origins
- **Error Handling**: Graceful connection management
- **Logging**: Detailed connection tracking
- **Authentication**: Secure API key handling

### 🔄 Coming Soon
- **Connection Pooling**: Multiple users support
- **Rate Limiting**: API usage control  
- **Health Checks**: Monitoring endpoints
- **SSL Termination**: HTTPS/WSS support

---

## 🐛 Troubleshooting

### "Connection timeout"
- ✅ Check if server is running (`npm run dev`)
- ✅ Verify port 8080 is not blocked
- ✅ Check console for error messages

### "OpenAI connection failed"
- ✅ Verify OPENAI_API_KEY in `.env`
- ✅ Check API key has Realtime API access
- ✅ Ensure stable internet connection

### "Client disconnected immediately"
- ✅ Check Chrome extension console
- ✅ Verify WebSocket URL in extension
- ✅ Test with `ws://localhost:8080`

---

## 📊 Architecture

```
Chrome Extension
       ↓ WebSocket
Backend Proxy (This Server)
       ↓ WebSocket + Auth Headers  
OpenAI Realtime API
       ↓ Streaming Audio/Text
Backend Proxy
       ↓ Forward Stream
Chrome Extension
       ↓ Play Audio
User Hears ChatGPT Mobile Experience! 🎤
```

---

## 🚀 Next Steps

1. **Test locally** with `npm run dev`
2. **Deploy to Railway** for production
3. **Update extension** with production URL
4. **Share with users** and get feedback!

**Ready to give users the ChatGPT mobile voice experience? Let's ship it!** 🔥
