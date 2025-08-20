# 🔍 Chrome Extension Content Script Debugging Guide

## 🚨 Issue: Content Script Not Loading

The voice-enabled content script isn't loading - no console logs appearing. Let's debug systematically.

## 🔧 Step 1: Test Debug Version (No Voice Components)

I've created a minimal debug version to isolate the issue.

### **Current Setup:**
- ✅ Built debug version: `content-interview-debug.js` 
- ✅ Updated manifest to use debug script
- ✅ Added OpenAI API permissions

### **Testing Steps:**

1. **Reload the extension:**
   ```bash
   # Extension is built - reload in Chrome
   # Go to chrome://extensions/
   # Find LeetMentor and click refresh button
   ```

2. **Navigate to LeetCode problem:**
   - Go to: https://leetcode.com/problems/two-sum/
   - Open Chrome DevTools (F12)
   - Go to Console tab

3. **Expected Debug Output:**
   ```
   🚀 DEBUG: LeetMentor AI Interviewer starting...
   🚀 DEBUG: Location: https://leetcode.com/problems/two-sum/
   🚀 DEBUG: Document ready state: loading/complete
   🚀 DEBUG: AIInterviewerDebug constructor called
   🚀 DEBUG: Initializing...
   ✅ DEBUG: Detected LeetCode problem page
   🚀 DEBUG: Timeout fired, detecting problem...
   ✅ DEBUG: Problem detected: Two Sum
   💉 DEBUG: Injecting minimal interface...
   ✅ DEBUG: Minimal interface injected successfully!
   ```

4. **Expected Visual Result:**
   - Colorful banner appears at top of problem description
   - Says: "🎉 DEBUG SUCCESS! 🎉 LeetMentor AI Interviewer Loaded Successfully!"

## 🔍 Step 2: Analyze Results

### **If Debug Version Works:**
✅ **Content script loading is fine**
❌ **Issue is with voice components**

**Next Steps:**
- Voice components import errors
- OpenAI API initialization issues
- TypeScript compilation problems in voice code

### **If Debug Version Doesn't Work:**
❌ **Fundamental content script issue**

**Potential Causes:**
1. **Chrome Extension Permissions**
2. **Manifest Configuration** 
3. **Content Script Injection Timing**
4. **Chrome Security Policies**

## 🐛 Step 3: Chrome Extension Diagnostics

### **Check Extension Console:**
1. Go to `chrome://extensions/`
2. Find LeetMentor
3. Click "service worker" link (opens extension background console)
4. Look for errors

### **Check Content Script Console:**
1. On LeetCode page, open DevTools
2. Check Console for errors
3. Check Network tab for failed requests
4. Check Security tab for blocked content

### **Common Chrome Extension Issues:**

#### **1. Permissions Problems:**
```json
// manifest.json - Added these permissions
"host_permissions": [
  "https://leetcode.com/*",
  "https://api.openai.com/*"  // ← Added for OpenAI API
]
```

#### **2. Content Security Policy:**
- Chrome blocks external API calls from content scripts
- **Solution**: Use background script as proxy (already implemented)

#### **3. Module Import Issues:**
```javascript
// Potential issue in content-interview.ts:
import { VoiceChat, VoiceChatConfig } from './components/VoiceChat';
import { VoiceUI } from './components/VoiceUI';
```
- Path resolution problems
- Missing dependencies
- TypeScript compilation errors

#### **4. Chrome Extension Context:**
```javascript
// API calls need to go through background script:
chrome.runtime.sendMessage({ type: 'GET_CONFIG' })
```

## 🔨 Step 4: Fix Voice Component Issues

If debug version works, the voice components are the problem. Here are likely issues:

### **Issue 1: Import Path Problems**
```typescript
// Current (might not work):
import { VoiceChat } from './components/VoiceChat';

// Alternative (try absolute path):
import { VoiceChat } from '../content/components/VoiceChat';
```

### **Issue 2: Voice Service Dependencies**
The voice services import shared services that might have issues:
```typescript
// In VoiceChat.ts:
import { VoiceService } from '../../shared/voice-service';
import { RealtimeVoiceService } from '../../shared/realtime-voice-service';
```

### **Issue 3: OpenAI API Key Access**
```typescript
// Content scripts can't directly access storage
// Must use message passing:
const response = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
```

### **Issue 4: WebSocket Permissions**
Realtime voice needs WebSocket access:
```json
// manifest.json might need:
"permissions": ["storage", "activeTab", "scripting", "webSocket"]
```

## 🎯 Step 5: Systematic Fix

### **Test 1: Debug Version**
- ✅ Confirms basic content script works
- ✅ Confirms injection logic works
- ✅ Confirms LeetCode integration works

### **Test 2: Voice Import Test**
Create minimal voice test:
```typescript
// Only import VoiceChat, no instantiation
import { VoiceChat } from './components/VoiceChat';
console.log('VoiceChat imported successfully');
```

### **Test 3: Voice Service Test**
```typescript
// Test voice service imports
import { VoiceService } from '../shared/voice-service';
console.log('VoiceService imported successfully');
```

### **Test 4: Full Voice Integration**
If imports work, test initialization:
```typescript
// Test basic voice initialization
const voiceChat = new VoiceChat();
console.log('VoiceChat instantiated successfully');
```

## 🔍 Chrome DevTools Debugging Commands

```javascript
// Check if content script loaded
window.leetmentorDebug

// Check extension context
chrome.runtime.id

// Check permissions
navigator.permissions.query({name: 'microphone'})

// Test background script communication
chrome.runtime.sendMessage({type: 'GET_CONFIG'})
```

## 📋 Debugging Checklist

### **Content Script Loading:**
- [ ] Debug version shows console logs
- [ ] Debug interface appears on LeetCode
- [ ] Navigation between problems works
- [ ] Chrome extension console shows no errors

### **Voice Component Issues:**
- [ ] Import errors in console
- [ ] TypeScript compilation errors
- [ ] Missing permissions for microphone/API
- [ ] Background script communication errors

### **Chrome Extension Issues:**
- [ ] Service worker errors
- [ ] Manifest validation errors
- [ ] Content Security Policy violations
- [ ] Permission denied errors

## 🚀 Next Steps

1. **Test debug version first** - this will tell us if it's a voice issue or content script issue
2. **Check Chrome extension console** for any errors
3. **Gradually add voice components back** to isolate the failing component
4. **Fix specific voice component issues** based on results

The debug version should help us quickly identify whether this is a content script loading issue or specifically a voice component problem! 🔍
