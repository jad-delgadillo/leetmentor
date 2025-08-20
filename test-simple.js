// Absolute simplest test - just an alert
console.log('🚀 SIMPLE TEST: Script loaded!');
alert('🎉 LeetMentor Extension is Working!');

// Create a simple floating box
const testDiv = document.createElement('div');
testDiv.innerHTML = `
  <div style="
    position: fixed;
    top: 20px;
    right: 20px;
    background: blue;
    color: white;
    padding: 20px;
    z-index: 10000;
    border-radius: 10px;
  ">
    ✅ EXTENSION WORKS!
  </div>
`;
document.body.appendChild(testDiv);
