// 🔍 LeetMentor Extension Debug Script
// Paste this into the LeetCode console to debug injection issues

console.log('🔍 Starting LeetMentor Debug...');

// Step 1: Check if content script loaded
console.log('1️⃣ Content Script Check:');
console.log('   leetmentorStandaloneReact exists:', !!window.leetmentorStandaloneReact);
console.log('   window.ReactDOM exists:', !!window.ReactDOM);
console.log('   document.createElement works:', !!document.createElement);

// Step 2: Check URL detection
console.log('2️⃣ URL Detection:');
const currentUrl = window.location.href;
console.log('   Current URL:', currentUrl);
console.log('   Contains leetcode.com/problems:', currentUrl.includes('leetcode.com/problems/'));
console.log('   Does NOT contain submissions:', !currentUrl.includes('/submissions/'));
console.log('   isLeetCodeProblemPage would be:', currentUrl.includes('leetcode.com/problems/') && !currentUrl.includes('/submissions/'));

// Step 3: Check injection targets
console.log('3️⃣ Injection Target Check:');
const selectors = [
    '[data-track-load="description_content"]',
    '[data-e2e-locator="console-question-detail-description"]', 
    '[class*="question-content"]',
    '[class*="description"]',
    '.elfjS',
    '.content__u3I1',
    '.css-1jqueqk',
    '[data-cy="question-content"]',
    '[class*="Description"]',
    '[class*="content"]',
    'main',
    'article',
    '.main-content',
    '#__next'
];

selectors.forEach((selector, index) => {
    const element = document.querySelector(selector);
    console.log(`   ${index + 1}. ${selector}:`, element ? '✅ FOUND' : '❌ NOT FOUND');
    if (element) {
        console.log(`      Element:`, element);
        console.log(`      Text length:`, element.textContent?.length || 0);
    }
});

// Step 4: Check for existing LeetMentor elements
console.log('4️⃣ Existing LeetMentor Elements:');
const existingElements = document.querySelectorAll('[id*="leetmentor"], [class*="leetmentor"], [data-leetmentor]');
console.log('   Found elements:', existingElements.length);
existingElements.forEach((el, i) => {
    console.log(`   ${i + 1}.`, el);
});

// Step 5: Check CSP
console.log('5️⃣ CSP Check:');
const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
console.log('   CSP meta tag:', cspMeta ? cspMeta.content : 'Not found');

// Step 6: Check for React on page
console.log('6️⃣ React Environment:');
console.log('   window.React:', !!window.React);
console.log('   React version:', window.React?.version || 'Not found');
console.log('   ReactDOM render:', !!window.ReactDOM?.render);
console.log('   ReactDOM createRoot:', !!window.ReactDOM?.createRoot);

// Step 7: Extension status
console.log('7️⃣ Extension Status:');
try {
    chrome.runtime.sendMessage({type: 'PING'}, (response) => {
        console.log('   Extension background response:', response);
    });
} catch (e) {
    console.log('   Extension error:', e.message);
}

// Step 8: Try manual injection test
console.log('8️⃣ Manual Injection Test:');
const testDiv = document.createElement('div');
testDiv.id = 'leetmentor-debug-test';
testDiv.innerHTML = '🎯 LeetMentor Debug Test - If you see this, injection works!';
testDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #4CAF50; color: white; padding: 10px; border-radius: 5px; z-index: 10000; font-family: Arial;';

const injectionTarget = document.querySelector('main') || document.querySelector('#__next') || document.body;
injectionTarget.appendChild(testDiv);

console.log('   Test div injected into:', injectionTarget.tagName);
console.log('   Test div visible:', document.getElementById('leetmentor-debug-test') ? '✅ YES' : '❌ NO');

// Clean up after 5 seconds
setTimeout(() => {
    const testEl = document.getElementById('leetmentor-debug-test');
    if (testEl) testEl.remove();
}, 5000);

console.log('🔍 Debug complete! Check the results above.');
console.log('📋 Copy this output to share with the developer.');

// Final summary
console.log('\n📊 SUMMARY:');
console.log('Content Script Loaded:', !!window.leetmentorStandaloneReact ? '✅' : '❌');
console.log('URL Detection:', (currentUrl.includes('leetcode.com/problems/') && !currentUrl.includes('/submissions/')) ? '✅' : '❌');
console.log('Injection Target Found:', selectors.some(s => document.querySelector(s)) ? '✅' : '❌'); 
console.log('Manual Injection Works:', document.getElementById('leetmentor-debug-test') ? '✅' : '❌');
