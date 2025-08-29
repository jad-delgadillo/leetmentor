# 🔍 UI Injection Debug Guide

## Step 1: Check if Content Script is Loading

1. **Open LeetCode** in Chrome (https://leetcode.com/problems/two-sum/)
2. **Open DevTools** (F12 or right-click → Inspect)
3. **Go to Console tab**
4. **Look for these logs:**
   ```
   🚀 STANDALONE REACT: StandaloneAIInterviewer constructor called
   🚀 STANDALONE REACT: Initializing...
   🚀 STANDALONE REACT: Document ready, proceeding with injection
   ```

### If you DON'T see these logs:
- Content script is not loading at all
- Check extension is enabled and reloaded

### If you DO see these logs:
- Content script is loading but injection is failing
- Continue to Step 2

## Step 2: Check for CSP Errors

In the **Console tab**, look for errors like:
```
Refused to execute inline script because it violates the following Content Security Policy directive
Refused to create a worker from 'blob:' because it violates CSP
Refused to evaluate a string as JavaScript because 'unsafe-eval' is not allowed
```

## Step 3: Check Extension Status

1. Go to **chrome://extensions/**
2. Find **LeetMentor**
3. Check if it's **enabled**
4. Click **reload** button
5. Check for any **error messages**

## Step 4: Manual Debug Commands

In the **Console tab** on LeetCode, run these commands:

```javascript
// Check if extension content script loaded
console.log('Extension loaded:', !!window.leetMentorStandalone);

// Check for our container
console.log('Container exists:', !!document.querySelector('[data-leetmentor]'));

// Check React root
console.log('React elements:', document.querySelectorAll('[data-reactroot]').length);

// Check for CSP violations
console.log('CSP meta tag:', document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content);
```

## Step 5: Check Network Tab

1. **Network tab** in DevTools
2. **Reload the page**
3. **Filter by "leetmentor"**
4. Check if `content-standalone.js` is loading successfully

## Common Issues & Fixes:

### Issue 1: CSP Blocking Inline Scripts
**Symptoms:** CSP errors in console
**Fix:** Use external script injection instead of inline

### Issue 2: Extension Not Loaded
**Symptoms:** No console logs at all
**Fix:** Reload extension, check manifest

### Issue 3: React Hydration Issues
**Symptoms:** Script loads but no UI appears
**Fix:** DOM injection timing problems

### Issue 4: LeetCode Page Changes
**Symptoms:** Injection worked before, stopped working
**Fix:** Update selectors for new DOM structure
