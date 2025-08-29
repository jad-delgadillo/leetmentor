# 🔧 CSP & UI Injection Troubleshooting Guide

## 🚀 **Quick Fix Steps**

### **Step 1: Reload Everything**
1. Go to `chrome://extensions/`
2. Find **LeetMentor** and click **reload** button
3. **Hard refresh** LeetCode page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Wait 3-5 seconds for the UI to appear

### **Step 2: Run Debug Script**
1. Open **LeetCode problem page** (e.g., https://leetcode.com/problems/two-sum/)
2. Open **DevTools** (`F12` or right-click → Inspect)
3. Go to **Console** tab
4. **Copy and paste** the entire content from `debug-extension.js`
5. **Press Enter** and check the results

## 🔍 **Debug Script Results Guide**

### ✅ **Good Results (Extension Working):**
```
✅ Content Script Loaded: true
✅ URL Detection: true  
✅ Injection Target Found: true
✅ Manual Injection Works: true
```

### ❌ **Problem Indicators:**

#### **Content Script Not Loading:**
```
❌ Content Script Loaded: false
```
**Fix:** Extension not loaded properly
- Reload extension in `chrome://extensions/`
- Check extension is enabled
- Look for errors in extension details

#### **URL Detection Failed:**
```
❌ URL Detection: false
```
**Fix:** Not on a LeetCode problem page
- Navigate to: https://leetcode.com/problems/two-sum/
- Avoid `/submissions/` or other non-problem pages

#### **No Injection Target:**
```
❌ Injection Target Found: false
```
**Fix:** Page structure changed or still loading
- Wait for page to fully load
- Try refreshing the page
- LeetCode may have updated their DOM structure

#### **Manual Injection Failed:**
```
❌ Manual Injection Works: false
```
**Fix:** Severe CSP restrictions
- This indicates strict Content Security Policy
- The fallback UI should still work

## 🛠️ **Advanced Debugging**

### **Check Console Logs**
Look for these specific log patterns:

#### **Normal Loading:**
```
🚀 STANDALONE REACT: StandaloneAIInterviewer constructor called
🎤 Initializing voice services...
🚀 STANDALONE REACT: Initializing...
🚀 STANDALONE REACT: Document ready, starting immediately
✅ STANDALONE REACT: Detected LeetCode problem page
🔍 STANDALONE REACT: Detecting problem...
✅ STANDALONE REACT: Found element with selector: [selector]
💉 STANDALONE REACT: Injecting interview interface...
✅ STANDALONE REACT: React root created and rendered successfully
```

#### **CSP Blocking (Fallback Activated):**
```
❌ STANDALONE REACT: React injection failed, trying fallback: [error]
🔄 STANDALONE REACT: Injecting fallback vanilla UI...
✅ FALLBACK: Vanilla UI injected successfully
```

### **CSP Error Examples:**
```
Refused to execute inline script because it violates CSP directive 'script-src'
Refused to create a worker from 'blob:' because it violates CSP directive 'worker-src'
Refused to evaluate a string as JavaScript because 'unsafe-eval' is not allowed
```

## 🎯 **What You Should See**

### **Full React UI (Best Case):**
- Professional gradient card with LeetMentor branding
- Problem information panel
- Start Interview button with animations
- Settings gear icon
- Full chat interface when interview starts

### **Fallback UI (CSP Blocked):**
- Simpler styled card with warning message
- Shows "React UI Blocked" notice
- Refresh button to try again
- Still shows problem information if detected

### **Nothing (Major Issue):**
- No UI appears at all
- Check console for errors
- Verify extension is loaded and enabled

## 🔧 **Common Solutions**

### **Solution 1: Extension Reload**
```
chrome://extensions/ → LeetMentor → Reload button
```

### **Solution 2: Hard Page Refresh**
```
Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### **Solution 3: Clear Browser Cache**
```
Settings → Privacy and Security → Clear browsing data
```

### **Solution 4: Disable Other Extensions**
- Temporarily disable ad blockers
- Disable other developer extensions
- Test with minimal extension set

### **Solution 5: Try Different LeetCode Page**
```
https://leetcode.com/problems/two-sum/
https://leetcode.com/problems/add-two-numbers/
https://leetcode.com/problems/longest-substring-without-repeating-characters/
```

## 📊 **Success Indicators**

### **✅ Extension Loaded Successfully:**
- Console shows: `✅ STANDALONE REACT: Content script loaded successfully!`
- Window object has: `window.leetmentorStandaloneReact`

### **✅ UI Injected Successfully:**
- Either full React UI or fallback UI appears
- Card appears within 3-5 seconds of page load
- No errors in console related to injection

### **✅ API Integration Working:**
- Extension popup shows API key configured
- Voice services initialize without errors
- Console shows: `✅ All services initialized successfully`

## 🆘 **Still Not Working?**

### **Copy This Debug Info:**
1. Run the debug script
2. Copy all console output
3. Include:
   - Browser version
   - Extension version  
   - URL you're testing on
   - Any error messages

### **Test Alternatives:**
1. Try in **Incognito mode**
2. Try in different **browser** (Edge, Firefox)
3. Test on **different LeetCode problems**
4. Check if it works on the **test page** (if you have one)

The enhanced extension now has:
- **Detailed debugging logs**
- **Fallback vanilla UI** for CSP issues
- **Better error handling**
- **Multiple injection strategies**

Your UI should appear even if React is blocked! 🎉
