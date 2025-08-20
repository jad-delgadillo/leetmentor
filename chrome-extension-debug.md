# 🔍 **Chrome Extension Debugging Guide**

## 🚨 **Issue: No UI Injection on LeetCode**

The content script isn't injecting UI on LeetCode problems. Let's debug systematically.

## 🔧 **Step 1: Verify Extension Loading**

### **Check Extension Console:**
1. Go to `chrome://extensions/`
2. Find "LeetMentor - AI Interview Practice"
3. Click "service worker" link (opens background script console)
4. Look for any errors or logs

### **Check Extension Status:**
- ✅ Extension should show as "Enabled"
- ✅ No red error messages
- ✅ Version should match your build

## 🔧 **Step 2: Test Simple Content Script**

### **Current Setup:**
- Using `content-simple-test.js` (minimal version)
- Should show red indicator in top-right corner
- Should show green indicator near problem title

### **Expected Results:**
```
🚀 SIMPLE TEST: Content script loading...
🚀 SIMPLE TEST: URL: https://leetcode.com/problems/two-sum/
✅ SIMPLE TEST: Simple indicator added to page
✅ SIMPLE TEST: On LeetCode problem page
✅ SIMPLE TEST: Found title element: Two Sum
✅ SIMPLE TEST: Title indicator added
✅ SIMPLE TEST: Content script completed
```

## 🔧 **Step 3: Check Content Script Console**

### **Open DevTools:**
1. Go to https://leetcode.com/problems/two-sum/
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for logs starting with `🚀 SIMPLE TEST:`

### **If No Logs Appear:**
- ❌ Content script not loading at all
- ❌ Check extension permissions
- ❌ Check manifest configuration

## 🔧 **Step 4: Check Extension Permissions**

### **Verify Permissions:**
```json
{
  "permissions": [
    "activeTab",
    "storage", 
    "scripting",
    "webNavigation"  // ← This is crucial for SPA
  ],
  "host_permissions": [
    "https://leetcode.com/*",
    "https://api.openai.com/*"
  ]
}
```

### **Check Site Access:**
1. Go to `chrome://extensions/`
2. Find LeetMentor
3. Click "Details"
4. Under "Site access" should be "On all sites" or "On specific sites"
5. If "On click", the extension won't auto-run

## 🔧 **Step 5: Test Manual Injection**

### **Test Background Script:**
1. Open background script console (`chrome://extensions/` → service worker)
2. Navigate to LeetCode problem
3. Look for logs:
```
🔄 Background: History state updated: https://leetcode.com/problems/two-sum/
✅ Background: Re-injecting content script for SPA navigation
✅ Background: Content script re-injected successfully
```

### **If No Background Logs:**
- ❌ `webNavigation` permission not working
- ❌ Background script not running
- ❌ Extension not properly installed

## 🔧 **Step 6: Common Issues & Fixes**

### **Issue 1: Extension Not Enabled**
```bash
# Check extension status
chrome://extensions/
# Enable if disabled
```

### **Issue 2: Wrong Site Access**
```bash
# Change from "On click" to "On all sites"
chrome://extensions/ → Details → Site access
```

### **Issue 3: Content Security Policy**
```bash
# LeetCode might block content scripts
# Check for CSP errors in console
```

### **Issue 4: Manifest Issues**
```bash
# Verify manifest.json is valid
# Check for syntax errors
```

## 🔧 **Step 7: Quick Diagnostic Commands**

### **Check Extension ID:**
```javascript
// In DevTools console on LeetCode
chrome.runtime.id
// Should return extension ID, not undefined
```

### **Test Message Passing:**
```javascript
// In DevTools console on LeetCode
chrome.runtime.sendMessage({type: 'GET_CONFIG'})
// Should return config or error
```

### **Check Content Script Context:**
```javascript
// In DevTools console on LeetCode
document.currentScript
// Should show content script info
```

## 🔧 **Step 8: Alternative Test**

### **Create Test Page:**
```html
<!-- test.html -->
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test Page</h1>
  <script>
    console.log('Test page loaded');
  </script>
</body>
</html>
```

### **Add to Manifest:**
```json
"content_scripts": [
  {
    "matches": ["file://*", "http://*", "https://*"],
    "js": ["content-simple-test.js"]
  }
]
```

## 🎯 **Expected Debugging Flow**

1. **Extension loads** → Background script console shows logs
2. **Navigate to LeetCode** → Background detects navigation
3. **Content script injects** → Page console shows `🚀 SIMPLE TEST:`
4. **UI appears** → Red indicator in corner, green near title
5. **Navigate to new problem** → Process repeats

## 🚨 **If Still Not Working**

### **Check These:**
- ✅ Extension is enabled
- ✅ Site access is "On all sites"
- ✅ No errors in background console
- ✅ No errors in page console
- ✅ Manifest is valid JSON
- ✅ Content script file exists in dist/

### **Try This:**
1. **Uninstall extension completely**
2. **Clear browser cache**
3. **Reinstall extension**
4. **Test on fresh LeetCode page**

Let me know what you see in the extension console and page console! 🔍
