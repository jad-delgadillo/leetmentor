#!/usr/bin/env node

/**
 * Switch Content Script Helper
 * 
 * Easily switch between different content script versions for debugging
 */

const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'public', 'manifest.json');

const contentScripts = {
  'debug': 'content-interview-debug.js',
  'voice': 'content-interview.js',
  'working': 'content-working.js',
  'minimal': 'content-minimal.js',
  'original': 'content.js',
  'standalone': 'content-standalone.js'
};

function switchContentScript(version) {
  if (!contentScripts[version]) {
    console.log('❌ Unknown version. Available versions:');
    Object.keys(contentScripts).forEach(v => {
      console.log(`   - ${v}: ${contentScripts[v]}`);
    });
    return;
  }

  try {
    // Read current manifest
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Update content script
    manifest.content_scripts[0].js = [contentScripts[version]];
    
    // Write back to manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    console.log(`✅ Switched to ${version} version: ${contentScripts[version]}`);
    console.log('📝 Run "npm run build" to rebuild the extension');
    console.log('🔄 Then reload the extension in Chrome');
    
  } catch (error) {
    console.error('❌ Error switching content script:', error.message);
  }
}

// Get command line argument
const version = process.argv[2];

if (!version) {
  console.log('🔧 Content Script Switcher');
  console.log('');
  console.log('Usage: node switch-content-script.js <version>');
  console.log('');
  console.log('Available versions:');
  Object.keys(contentScripts).forEach(v => {
    console.log(`   ${v}: ${contentScripts[v]}`);
  });
  console.log('');
  console.log('Examples:');
  console.log('   node switch-content-script.js debug   # Switch to debug version');
  console.log('   node switch-content-script.js voice   # Switch to voice version');
} else {
  switchContentScript(version);
}
