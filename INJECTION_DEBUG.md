# LeetMentor Injection Debug Guide

## Issue: UI Not Injecting After Build

After improving the UI/UX with modern CSS, the React interface is not being injected into LeetCode pages.

## Potential Causes & Solutions

### 1. **CSS Custom Properties Issue** ✅ FIXED
- **Problem**: CSS custom properties (variables) don't work reliably in content scripts
- **Solution**: Converted all CSS variables to hard-coded values

### 2. **Console Debugging Steps**

To debug the injection issue:

1. **Open Chrome DevTools** on a LeetCode problem page
2. **Check Console** for LeetMentor logs:
   ```
   🚀 STANDALONE: Content script loading...
   🚀 STANDALONE REACT: StandaloneAIInterviewer constructor called
   🚀 STANDALONE REACT: Initializing...
   ✅ STANDALONE REACT: Detected LeetCode problem page
   🔍 STANDALONE REACT: Detecting problem...
   💉 STANDALONE REACT: Injecting interview interface...
   ```

3. **Check Network Tab** for CSS loading:
   - Look for `content-standalone.css` being loaded
   - Check if there are any 404 errors

4. **Check Elements Tab**:
   - Look for `<div id="leetmentor-standalone">` in the DOM
   - Check if CSS test class is present: `.leetmentor-css-test`

### 3. **Manual Testing Commands**

Run these in the browser console:

```javascript
// Check if content script loaded
console.log('LeetMentor loaded:', typeof window.leetmentorStandalone !== 'undefined');

// Check for injected container
console.log('Container exists:', !!document.getElementById('leetmentor-standalone'));

// Check for CSS test element
const testDiv = document.createElement('div');
testDiv.className = 'leetmentor-css-test';
document.body.appendChild(testDiv);
console.log('CSS loaded:', getComputedStyle(testDiv).background.includes('red'));

// Force injection attempt
if (window.leetmentorStandalone) {
  window.leetmentorStandalone.detectProblem();
}
```

### 4. **Common Fixes**

1. **Clear Extension Cache**:
   - Go to chrome://extensions/
   - Click "Reload" on LeetMentor extension
   - Hard refresh LeetCode page (Ctrl+Shift+R)

2. **Check CSP Issues**:
   - Look for CSP errors in console
   - Check if React is blocked from mounting

3. **Try Force Injection**:
   ```javascript
   // Run in console to force inject
   const container = document.createElement('div');
   container.innerHTML = '<div style="position:fixed;top:10px;right:10px;background:red;width:100px;height:100px;z-index:9999;">TEST</div>';
   document.body.appendChild(container);
   ```

### 5. **Build Issues**

If build is the problem:
```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build

# Check build output
ls -la dist/
```

### 6. **CSS Loading Test**

The CSS includes a test class `.leetmentor-css-test` that creates a red 100x100px box in the top-right corner. If you see this box, CSS is loading correctly.

## Next Steps

1. Test the extension after the CSS variable fixes
2. Check browser console for specific error messages
3. Use the manual testing commands above
4. Report back with specific console logs if still not working
