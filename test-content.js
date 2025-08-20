// SIMPLE TEST CONTENT SCRIPT
console.log('🟢 TEST: Content script is loading!');
console.log('🟢 TEST: Current URL:', window.location.href);
console.log('🟢 TEST: Document ready state:', document.readyState);

// Add a very visible test element
const testDiv = document.createElement('div');
testDiv.innerHTML = `
  <div style="
    position: fixed; 
    top: 10px; 
    left: 10px; 
    background: red; 
    color: white; 
    padding: 20px; 
    z-index: 99999;
    font-size: 18px;
    border: 3px solid yellow;
  ">
    🟢 LEETMENTOR TEST WORKING! 🟢
  </div>
`;
document.body.appendChild(testDiv);

console.log('🟢 TEST: Test element added to page');
