console.log('🚀 LeetMentor: Working content script starting...');

import { LeetCodeProblem, TestCase, CodeSnippet } from '../types/leetcode';
import { VoiceService } from '../shared/voice-service';

console.log('✅ LeetMentor: Types and VoiceService imported successfully');

// Content script for LeetCode problem detection (WITHOUT VOICE SERVICES)
class LeetCodeDetector {
  private problem: LeetCodeProblem | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private embeddedConfig: any = null;

  constructor() {
    console.log('🚀 LeetMentor: Content script starting...');
    
    // SIMPLE: Just inject immediately to body
    this.injectSimpleInterface();
    
    // Also try multiple times in case page is still loading
    setTimeout(() => this.injectSimpleInterface(), 500);
    setTimeout(() => this.injectSimpleInterface(), 2000);
    setTimeout(() => this.injectSimpleInterface(), 5000);
  }

  private injectSimpleInterface() {
    // Don't inject if already exists
    if (document.getElementById('leetmentor-simple-interface')) {
      console.log('✅ LeetMentor: Interface already exists');
      return;
    }

    console.log('🚀 LeetMentor: Injecting simple interface...');
    
    const interfaceDiv = document.createElement('div');
    interfaceDiv.id = 'leetmentor-simple-interface';
    interfaceDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        background: white;
        border: 2px solid #3b82f6;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-radius: 10px 10px 0 0;
          font-weight: 600;
        ">
          <div>🤖 AI Interview Assistant</div>
          <button onclick="this.parentElement.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            font-size: 18px;
            cursor: pointer;
          ">×</button>
        </div>
        
        <div style="
          padding: 20px;
          text-align: center;
        ">
          <div style="
            background: #f0f9ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
          ">
            <strong style="color: #3b82f6;">✅ LeetMentor is Working!</strong><br>
            <small>Interface successfully injected</small>
          </div>
          
          <div style="
            background: #eff6ff;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
            text-align: left;
            font-size: 14px;
            line-height: 1.5;
          ">
            <strong>🎯 Ready for Interview!</strong><br>
            Hi! I'm your AI interviewer. I can help you practice this LeetCode problem step by step.
            
            <div style="margin-top: 10px;">
              <strong>What I can do:</strong><br>
              • Guide you through problem understanding<br>
              • Discuss different approaches<br>
              • Help with time/space complexity<br>
              • Review your solution
            </div>
          </div>
          
          <div style="margin-top: 15px;">
            <textarea 
              id="user-input" 
              placeholder="Tell me what you understand about this problem..."
              style="
                width: 100%;
                height: 60px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                padding: 10px;
                font-size: 14px;
                resize: none;
                box-sizing: border-box;
              "
            ></textarea>
            
            <button 
              onclick="sendMessage()"
              style="
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
                width: 100%;
              "
            >Send Message ✈️</button>
          </div>
          
          <div id="messages" style="
            margin-top: 15px;
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 10px;
            background: #fafafa;
            text-align: left;
            font-size: 13px;
            display: none;
          "></div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(interfaceDiv);
    
    // Add the send message function to window
    (window as any).sendMessage = () => {
      const input = document.getElementById('user-input') as HTMLTextAreaElement;
      const messages = document.getElementById('messages');
      
      if (input && input.value.trim()) {
        // Show messages area
        if (messages) {
          messages.style.display = 'block';
          messages.innerHTML += `
            <div style="margin-bottom: 10px; padding: 8px; background: #3b82f6; color: white; border-radius: 6px;">
              <strong>You:</strong> ${input.value}
            </div>
            <div style="margin-bottom: 10px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
              <strong>AI:</strong> Great! I can see you're working on this problem. Let's break it down step by step. 
              First, can you explain what the problem is asking you to do in your own words?
            </div>
          `;
          messages.scrollTop = messages.scrollHeight;
        }
        input.value = '';
      }
    };

    console.log('✅ LeetMentor: Simple interface injected successfully!');
  }

  private forceInjection() {
    console.log('🚀 LeetMentor: FORCE INJECTION ATTEMPT');
    
    // Skip all checks - just try to inject
    if (!document.getElementById('leetmentor-interview-interface')) {
      this.injectInterviewInterface();
    }
    
    // Also try fallback
    if (!document.getElementById('leetmentor-interview-interface') && !document.getElementById('leetmentor-simple-interface')) {
      this.tryFallbackInjection();
    }
  }

  public destroy() {
    // Cleanup event listeners
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
    }
    
    if (this.cleanupSpacebarListener) {
      this.cleanupSpacebarListener();
    }
    
    if (this.voiceService) {
      this.voiceService.destroy?.();
    }
    
    console.log('🧹 LeetMentor: Cleaned up content script');
  }

  private setupContextWatcher() {
    // Check extension context every 30 seconds
    setInterval(() => {
      if (!this.isExtensionContextValid()) {
        console.warn('LeetMentor: Extension context became invalid during runtime');
        this.showContextInvalidatedMessage();
      }
    }, 30000);
  }

  private showContextInvalidatedMessage() {
    // Only show once
    if (document.getElementById('leetmentor-context-invalid')) return;
    
    const message = document.createElement('div');
    message.id = 'leetmentor-context-invalid';
    message.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10001;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 600;
        font-size: 14px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        cursor: pointer;
        max-width: 350px;
      " onclick="window.location.reload()">
        🔄 LeetMentor Extension Disconnected<br>
        <small style="font-weight: 400; opacity: 0.9; font-size: 12px;">
          The extension was reloaded. Click here to refresh the page and restore functionality.
        </small>
      </div>
    `;
    
    document.body.appendChild(message);
  }

  private setupMessageListener() {
    try {
      if (!this.isExtensionContextValid()) {
        console.warn('LeetMentor: Cannot setup message listener - extension context invalid');
        return;
      }

      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.type) {
          case 'EXTRACT_PROBLEM_DATA':
            this.extractProblemData().then(problem => {
              sendResponse({ success: true, data: problem });
            }).catch(error => {
              sendResponse({ success: false, error: error.message });
            });
            return true;

          case 'NAVIGATION_DETECTED':
            this.handleNavigation();
            break;
        }
      });
    } catch (error) {
      console.warn('LeetMentor: Failed to setup message listener:', error);
    }
  }

  private setupDOMObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          if (this.isProblemContentLoaded()) {
            this.detectCurrentProblem();
          }
          
          // Watch for LeetCode submission results
          this.detectSubmissionResult(mutation);
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private detectSubmissionResult(mutation: MutationRecord) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        
        // Check for success indicators
        const successSelectors = [
          '[data-e2e-locator="submission-result-accepted"]',
          '.text-green-s',
          '[class*="accepted"]',
          '[class*="success"]'
        ];
        
        const errorSelectors = [
          '[data-e2e-locator="submission-result-wrong-answer"]',
          '[data-e2e-locator="submission-result-time-limit-exceeded"]',
          '[data-e2e-locator="submission-result-runtime-error"]',
          '.text-red-s',
          '[class*="wrong"]',
          '[class*="error"]'
        ];
        
        // Check if this element or its children contain submission results
        const isSuccess = successSelectors.some(selector => 
          element.matches?.(selector) || element.querySelector?.(selector)
        );
        
        const isError = errorSelectors.some(selector => 
          element.matches?.(selector) || element.querySelector?.(selector)
        );
        
        if (isSuccess || isError) {
          const resultText = element.textContent || '';
          
          if (resultText.toLowerCase().includes('accepted') || 
              resultText.toLowerCase().includes('success')) {
            console.log('✅ LeetMentor: Detected successful submission');
            this.handleSubmissionResult(true, 'Accepted - All test cases passed!');
          } else if (resultText.toLowerCase().includes('wrong answer') ||
                     resultText.toLowerCase().includes('time limit') ||
                     resultText.toLowerCase().includes('runtime error')) {
            console.log('❌ LeetMentor: Detected failed submission');
            this.handleSubmissionResult(false, resultText);
          }
        }
      }
    });
  }

  private async handleSubmissionResult(isAccepted: boolean, resultText: string) {
    if (!this.problem) return;
    
    try {
      if (isAccepted) {
        // Celebrate success
        this.addMessage('🎉 Congratulations! Your solution was accepted! All test cases passed.', 'ai');
        
        if (this.isVoiceEnabled && this.voiceService) {
          await this.speakAIResponse('Excellent work! Your solution passed all test cases. Now let\'s discuss the time and space complexity of your solution.');
        }
        
        // Ask about complexity
        setTimeout(() => {
          this.addMessage('Now that your solution works, can you analyze its time and space complexity? What are the Big O notations for both?', 'ai');
        }, 2000);
        
      } else {
        // Handle failure supportively
        this.addMessage(`I see your submission didn't pass all test cases. The result was: "${resultText}". Let's debug this together - what do you think might be the issue?`, 'ai');
        
        if (this.isVoiceEnabled && this.voiceService) {
          await this.speakAIResponse('No worries, debugging is part of the process. Let\'s figure out what went wrong together.');
        }
      }
      
      // Notify background script for potential feedback
      if (this.isExtensionContextValid()) {
        await this.sendMessageSafely({
          type: 'HANDLE_SUBMISSION_RESULT',
          data: {
            problem: this.problem,
            result: resultText,
            isAccepted,
            config: this.embeddedConfig
          }
        });
      }
      
    } catch (error) {
      console.error('LeetMentor: Error handling submission result:', error);
    }
  }

  private setupURLWatcher() {
    this.urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.currentUrl) {
        console.log('LeetMentor: URL changed from', this.currentUrl, 'to', currentUrl);
        this.currentUrl = currentUrl;
        this.handleNavigation();
      }
    }, 500);

    window.addEventListener('popstate', () => {
      setTimeout(() => this.handleNavigation(), 100);
    });
  }

  public async clearOldCache() {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('LeetMentor: Extension context invalidated, skipping cache clear');
        return;
      }
      
      await chrome.storage.local.remove(['leetmentor_current_problem', 'leetmentor_problem_timestamp']);
      console.log('LeetMentor: Cleared old cached problem data');
    } catch (error) {
      console.warn('LeetMentor: Failed to clear cache:', error);
      // Don't throw - this isn't critical
    }
  }

  private isExtensionContextValid(): boolean {
    try {
      // Check if chrome.runtime is available and not invalidated
      return !!(chrome && chrome.runtime && chrome.runtime.id && !chrome.runtime.lastError);
    } catch (error) {
      return false;
    }
  }

  private handleNavigation() {
    console.log('LeetMentor: Handling navigation to', window.location.href);
    this.clearOldCache();
    this.problem = null;
    
    setTimeout(() => {
      this.detectCurrentProblem();
      this.injectInterviewInterface();
    }, 1000);
  }

  private isProblemContentLoaded(): boolean {
    return !!(
      document.querySelector('[data-cy="question-title"]') ||
      document.querySelector('.css-v3d350') ||
      document.querySelector('[class*="question-title"]') ||
      document.querySelector('h1') ||
      document.querySelector('[class*="title"]') ||
      document.querySelector('.text-title-large') ||
      document.querySelector('[data-e2e-locator="console-question-title"]')
    );
  }

  public async detectCurrentProblem() {
    try {
      const problem = await this.extractProblemData();
      if (problem) {
        const isNewProblem = !this.problem || 
                            problem.id !== this.problem.id || 
                            problem.title !== this.problem.title ||
                            problem.url !== this.problem.url;
        
        if (isNewProblem) {
          console.log('LeetMentor: Detected new/updated problem:', problem.title, 'ID:', problem.id);
          await this.clearOldCache();
          this.problem = problem;
          this.initializeEmbeddedInterview();
          
          // Try to save problem data, but don't fail if extension context is invalid
          try {
            if (this.isExtensionContextValid()) {
              await chrome.storage.local.set({
                'leetmentor_current_problem': problem,
                'leetmentor_problem_timestamp': Date.now()
              });
            }
          } catch (storageError) {
            console.warn('LeetMentor: Could not save problem data to storage:', storageError);
            // Continue without storage - not critical
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect problem:', error);
    }
  }

  private async extractProblemData(): Promise<LeetCodeProblem | null> {
    const url = window.location.href;
    const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
    
    if (!match) return null;

    const titleSlug = match[1];
    
    const titleElement = document.querySelector('[data-cy="question-title"]') || 
                        document.querySelector('.css-v3d350') ||
                        document.querySelector('[class*="question-title"]') ||
                        document.querySelector('h1') ||
                        document.querySelector('[class*="title"]') ||
                        document.querySelector('.text-title-large') ||
                        document.querySelector('[data-e2e-locator="console-question-title"]') ||
                        document.querySelector('div[class*="title"]');
    
    if (!titleElement) {
      console.log('LeetMentor: Could not find title element on page');
      return null;
    }

    const title = titleElement.textContent?.trim() || '';
    
    // Extract difficulty
    const difficultyElement = document.querySelector('[diff]') ||
                             document.querySelector('[class*="difficulty"]') ||
                             document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard');
    
    let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
    if (difficultyElement) {
      const diffText = difficultyElement.textContent?.toLowerCase() || '';
      if (diffText.includes('easy')) difficulty = 'Easy';
      else if (diffText.includes('hard')) difficulty = 'Hard';
    }

    return {
      id: titleSlug,
      title,
      titleSlug,
      difficulty,
      description: 'Problem detected successfully',
      exampleTestCases: [],
      constraints: [],
      hints: [],
      topicTags: [],
      companyTags: [],
      url,
      codeSnippets: [],
      similarQuestions: []
    };
  }

  private showExtensionRunningIndicator() {
    console.log('🔧 LeetMentor: Adding extension running indicator...');
    
    const indicator = document.createElement('div');
    indicator.id = 'leetmentor-running-indicator';
    
    if (!this.isExtensionContextValid()) {
      // Show reload prompt if extension context is invalid
      indicator.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          cursor: pointer;
          max-width: 300px;
        " onclick="window.location.reload()">
          ⚠️ LeetMentor: Extension needs reload<br>
          <small style="font-weight: 400; opacity: 0.9;">Click to refresh page</small>
        </div>
      `;
      // Don't auto-remove if context is invalid
    } else {
      indicator.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          padding: 10px 15px;
          border-radius: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-weight: 600;
          font-size: 14px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        ">
          ✅ LeetMentor Working Version Active!
        </div>
      `;
      setTimeout(() => indicator.remove(), 3000);
    }

    document.body.appendChild(indicator);
    console.log('✅ LeetMentor: Extension status indicator added');
  }

  private tryMultipleInjectionStrategies() {
    setTimeout(() => this.attemptInjection(), 100);
    setTimeout(() => this.attemptInjection(), 1000);
    setTimeout(() => this.attemptInjection(), 3000);
  }

  private attemptInjection() {
    if (document.getElementById('leetmentor-interview-interface')) {
      console.log('✅ LeetMentor: Interface already exists, skipping injection');
      return;
    }
    
    console.log('🔍 LeetMentor: Attempting injection...');
    
    // Force injection even if problem not detected yet
    try {
      this.injectInterviewInterface();
      this.detectCurrentProblem();
      console.log('✅ LeetMentor: Injection attempt completed');
    } catch (error) {
      console.error('❌ LeetMentor: Injection failed:', error);
      // Try fallback injection
      setTimeout(() => this.tryFallbackInjection(), 1000);
    }
  }

  private injectInterviewInterface() {
    console.log('🔍 LeetMentor: Starting interface injection...');
    
    const existingInterface = document.getElementById('leetmentor-interview-interface');
    if (existingInterface) {
      console.log('✅ LeetMentor: Interface already exists');
      return;
    }

    const problemDescriptionContainer = this.findProblemDescriptionContainer();
    
    if (!problemDescriptionContainer) {
      console.warn('⚠️ LeetMentor: Could not find problem description container - trying fallback');
      this.tryFallbackInjection();
      return;
    }

    console.log('✅ LeetMentor: Found problem description container, injecting interface...');

    // Create minimal, elegant interface
    const interfaceContainer = document.createElement('div');
    interfaceContainer.id = 'leetmentor-interview-interface';
    interfaceContainer.style.cssText = `
      background: #f8fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      margin: 20px 0 16px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
      transition: all 0.3s ease;
    `;

    // Create modern header with toggle
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      cursor: pointer;
      border-bottom: 1px solid #e5e7eb;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 8px 8px 0 0;
      transition: all 0.2s ease;
    `;

    const titleSection = document.createElement('div');
    titleSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    const avatar = document.createElement('div');
    avatar.innerHTML = '🤖';
    avatar.style.cssText = `
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
    `;

    const titleText = document.createElement('div');
    titleText.innerHTML = `
      <div style="font-size: 15px; color: #1f2937; font-weight: 600; margin-bottom: 2px;">
        AI Interview Assistant
      </div>
      <div style="font-size: 12px; color: #6b7280; font-weight: 400;">
        Ready to help you ace this problem!
      </div>
    `;

    titleSection.appendChild(avatar);
    titleSection.appendChild(titleText);

    const toggleSection = document.createElement('div');
    toggleSection.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const statusDot = document.createElement('div');
    statusDot.style.cssText = `
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      animation: pulse 2s infinite;
    `;

    const toggleIndicator = document.createElement('div');
    toggleIndicator.innerHTML = '+';
    toggleIndicator.style.cssText = `
      background: #3b82f6;
      color: white;
      border-radius: 6px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
    `;

    toggleSection.appendChild(statusDot);
    toggleSection.appendChild(toggleIndicator);

    header.appendChild(titleSection);
    header.appendChild(toggleSection);

    // Add hover effects
    header.addEventListener('mouseenter', () => {
      header.style.background = 'linear-gradient(135deg, #f1f5f9, #e2e8f0)';
      toggleIndicator.style.transform = 'scale(1.1)';
    });

    header.addEventListener('mouseleave', () => {
      header.style.background = 'linear-gradient(135deg, #f8fafc, #f1f5f9)';
      toggleIndicator.style.transform = 'scale(1)';
    });

    const chatInterface = this.createMinimalChatInterface();
    chatInterface.style.display = 'none'; // Start collapsed
    
    interfaceContainer.appendChild(header);
    interfaceContainer.appendChild(chatInterface);

    // Insert at the END of the description area, not the beginning
    problemDescriptionContainer.appendChild(interfaceContainer);

    let isExpanded = false;
    header.addEventListener('click', () => {
      isExpanded = !isExpanded;
      chatInterface.style.display = isExpanded ? 'block' : 'none';
      toggleIndicator.innerHTML = isExpanded ? '−' : '+';
      toggleIndicator.style.backgroundColor = isExpanded ? '#059669' : '#374151';
    });

    this.initializeEmbeddedInterview();
    console.log('✅ LeetMentor: Successfully injected minimal interface!');
  }

  private findProblemDescriptionContainer(): Element | null {
    console.log('🔍 LeetMentor: Searching for problem description container...');
    
    // Updated selectors for current LeetCode layout (2024)
    const selectors = [
      // Current LeetCode selectors (most specific first)
      '[data-track-load="description_content"]',
      '.elfjS', // New LeetCode content class
      '.css-1jqueqk', // Legacy LeetCode content
      '[data-cy="question-content"]',
      'div[class*="content"][class*="description"]',
      'div[class*="question"][class*="content"]',
      'div[class*="problem"][class*="description"]',
      // More generic fallbacks
      'main .content',
      'main > div > div', // Common LeetCode pattern
      'main',
      '[role="main"]',
      '.content'
    ];

    // Debug: log all available elements
    console.log('🔍 Available main elements:', document.querySelectorAll('main'));
    console.log('🔍 Available content elements:', document.querySelectorAll('.content, [class*="content"]'));
    console.log('🔍 Available data-cy elements:', document.querySelectorAll('[data-cy]'));

    for (const selector of selectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`✅ Found container with selector: ${selector}`, element);
          return element;
        }
      } catch (error) {
        console.warn(`⚠️ Error with selector "${selector}":`, error);
      }
    }

    // Final fallback: try to find any suitable content container
    console.log('🔄 Trying fallback container search...');
    const fallbackContainers = document.querySelectorAll('main > div, .container, [class*="layout"], [class*="wrapper"]');
    if (fallbackContainers.length > 0) {
      console.log('✅ Using fallback container:', fallbackContainers[0]);
      return fallbackContainers[0];
    }

    console.error('❌ Could not find any suitable container');
    return null;
  }

  private tryFallbackInjection() {
    console.log('🔄 LeetMentor: Attempting fallback injection...');
    
    // Always inject to body as last resort
    if (document.body) {
      this.createAndInjectSimpleInterface(document.body);
    } else {
      console.log('⚠️ LeetMentor: No body element found, trying again later...');
      setTimeout(() => this.tryFallbackInjection(), 500);
    }
  }

  private createAndInjectSimpleInterface(container: Element) {
    console.log('🔧 LeetMentor: Creating fallback interface...');
    
    const existing = document.getElementById('leetmentor-simple-interface');
    if (existing) existing.remove();
    
    const interfaceContainer = document.createElement('div');
    interfaceContainer.id = 'leetmentor-simple-interface';
    interfaceContainer.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      width: 350px;
      max-height: 600px;
      background: white;
      border: 2px solid #3b82f6;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
    `;

    interfaceContainer.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 10px 10px 0 0;
        font-weight: 600;
      ">
        <div>🤖 AI Interview Assistant (Working!)</div>
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
        ">×</button>
      </div>
      
      <div style="
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        max-height: 350px;
        border-bottom: 1px solid #e5e7eb;
      " id="leetmentor-messages-simple">
        <div style="
          background: #f3f4f6;
          padding: 12px;
          border-radius: 8px;
          border-left: 4px solid #3b82f6;
          margin-bottom: 12px;
          font-size: 14px;
          line-height: 1.4;
        ">
          <strong style="color: #3b82f6;">🤖 AI Interviewer:</strong><br>
          Perfect! The extension is now working. I can see this LeetCode problem. Let's start by having you explain the problem in your own words. What do you understand about what we need to solve?
        </div>
      </div>
      
      <div style="
        padding: 15px;
        background: #f9fafb;
        border-radius: 0 0 10px 10px;
      ">
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <textarea 
            id="leetmentor-input-simple"
            placeholder="Type your response here..."
            style="
              flex: 1;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              padding: 8px;
              font-size: 14px;
              font-family: inherit;
              resize: none;
              height: 36px;
            "
          ></textarea>
          <button 
            id="leetmentor-send-btn"
            style="
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 6px;
              padding: 8px 16px;
              cursor: pointer;
              font-size: 14px;
            "
          >Send</button>
        </div>
      </div>
    `;

    const sendBtn = interfaceContainer.querySelector('#leetmentor-send-btn');
    const input = interfaceContainer.querySelector('#leetmentor-input-simple') as HTMLTextAreaElement;

    const sendMessage = () => {
      const message = input.value.trim();
      if (message) {
        this.addSimpleMessage(message, 'user');
        input.value = '';
        this.handleUserMessage(message);
      }
    };

    sendBtn?.addEventListener('click', sendMessage);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    container.appendChild(interfaceContainer);
    console.log('✅ LeetMentor: Fallback interface injected successfully!');
  }

  private createMinimalChatInterface(): HTMLDivElement {
    const chatContainer = document.createElement('div');
    chatContainer.style.cssText = `
      background: white;
      display: flex;
      flex-direction: column;
      max-height: 450px;
      border-radius: 0 0 8px 8px;
    `;

    const messagesArea = document.createElement('div');
    messagesArea.id = 'leetmentor-messages';
    messagesArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      min-height: 200px;
      max-height: 280px;
      background: #fafafa;
    `;

    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.cssText = `
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      margin-bottom: 12px;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    `;
    welcomeMessage.innerHTML = `<strong>🤖 AI Interviewer:</strong><br>Hello! I'm your AI interview partner for this LeetCode problem. I'll help you think through the solution step by step. Let's start by discussing your understanding of the problem. What do you think this problem is asking you to do?`;
    messagesArea.appendChild(welcomeMessage);

    // Text input area (moved voice controls to bottom)
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 12px 16px;
      background: white;
      display: flex;
      gap: 8px;
      align-items: flex-end;
      border-bottom: 1px solid #e5e7eb;
    `;

    const textInput = document.createElement('textarea');
    textInput.id = 'leetmentor-text-input';
    textInput.placeholder = 'Type your response here or hold SPACE for voice (optimized for Mexican English accents)...';
    textInput.style.cssText = `
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      font-family: inherit;
      resize: none;
      min-height: 40px;
      max-height: 100px;
      line-height: 1.4;
      transition: border-color 0.2s ease;
    `;

    textInput.addEventListener('focus', () => {
      textInput.style.borderColor = '#3b82f6';
    });

    textInput.addEventListener('blur', () => {
      textInput.style.borderColor = '#d1d5db';
    });

    textInput.addEventListener('input', () => {
      textInput.style.height = 'auto';
      textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
    });

    const sendButton = document.createElement('button');
    sendButton.innerHTML = '✈️'; // Paper airplane emoji
    sendButton.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    sendButton.addEventListener('mouseenter', () => {
      sendButton.style.background = '#2563eb';
      sendButton.style.transform = 'scale(1.05)';
    });

    sendButton.addEventListener('mouseleave', () => {
      sendButton.style.background = '#3b82f6';
      sendButton.style.transform = 'scale(1)';
    });

    sendButton.addEventListener('click', () => {
      const message = textInput.value.trim();
      if (message) {
        this.handleUserMessage(message);
        textInput.value = '';
        textInput.style.height = '40px';
      }
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    });

    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);

    // Voice controls at the bottom
    const voiceControls = document.createElement('div');
    voiceControls.style.cssText = `
      padding: 12px 16px;
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border-radius: 0 0 8px 8px;
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
    `;

    const voiceButton = document.createElement('button');
    voiceButton.className = 'leetmentor-voice-btn';
    voiceButton.innerHTML = '🎤 Push to Talk';
    voiceButton.style.cssText = `
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      flex: 1;
      max-width: 140px;
      box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
    `;

    const voiceToggle = document.createElement('button');
    voiceToggle.innerHTML = this.isVoiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
    voiceToggle.style.cssText = `
      background: ${this.isVoiceEnabled ? '#10b981' : '#6b7280'};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;

    const helpText = document.createElement('span');
    helpText.style.cssText = `
      font-size: 11px;
      color: #6b7280;
      font-style: italic;
      text-align: center;
      flex: 1;
    `;
    helpText.textContent = 'Hold SPACE or button to speak (accent-friendly)';

    voiceToggle.addEventListener('click', () => {
      this.toggleVoice();
      voiceToggle.innerHTML = this.isVoiceEnabled ? '🔊 Voice ON' : '🔇 Voice OFF';
      voiceToggle.style.background = this.isVoiceEnabled ? '#10b981' : '#6b7280';
    });

    let isHolding = false;
    
    const startVoiceCapture = () => {
      if (!this.isVoiceEnabled) {
        this.addMessage('Please enable voice first by clicking the Voice ON button.', 'ai');
        return;
      }
      
      if (!this.voiceService) {
        this.addMessage('Voice service not available. Please refresh the page.', 'ai');
        return;
      }
      
      isHolding = true;
      this.startListening();
    };
    
    const stopVoiceCapture = () => {
      if (isHolding && this.voiceService) {
        isHolding = false;
        this.stopListening();
      }
    };

    // Mouse events for button
    voiceButton.addEventListener('mousedown', startVoiceCapture);
    voiceButton.addEventListener('mouseup', stopVoiceCapture);
    voiceButton.addEventListener('mouseleave', stopVoiceCapture);
    
    // Touch events for mobile
    voiceButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startVoiceCapture();
    });
    
    voiceButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      stopVoiceCapture();
    });

    // Add spacebar functionality
    this.setupSpacebarPushToTalk(startVoiceCapture, stopVoiceCapture);

    voiceControls.appendChild(voiceButton);
    voiceControls.appendChild(helpText);
    voiceControls.appendChild(voiceToggle);

    chatContainer.appendChild(messagesArea);
    chatContainer.appendChild(inputArea);
    chatContainer.appendChild(voiceControls);

    return chatContainer;
  }

  private async toggleVoice() {
    console.log('🎛️ LeetMentor: Toggling voice. Current state:', this.isVoiceEnabled);
    
    if (!this.isVoiceEnabled) {
      // Enable voice
      console.log('🔄 LeetMentor: Enabling voice...');
      
      // Test microphone first
      const micTestResult = await this.testMicrophone();
      if (!micTestResult.success) {
        this.addMessage(`❌ Microphone test failed: ${micTestResult.error}. Please check your microphone permissions and try again.`, 'ai');
        return;
      }
      
      if (!this.voiceService) {
        console.log('🔄 LeetMentor: Initializing voice service...');
        await this.initializeVoiceService();
      }
      
      if (this.voiceService) {
        this.isVoiceEnabled = true;
        console.log('✅ LeetMentor: Voice enabled successfully');
        this.addMessage(`🎤 Voice is now enabled with enhanced Mexican English accent recognition! 
        
✅ Microphone: Working
✅ Recognition: OpenAI Whisper + Browser fallback
✅ Optimized: For Mexican English accents

Hold the "Push to Talk" button and speak naturally, or the AI will read responses to you. You'll see what the system hears in real-time.`, 'ai');
      } else {
        console.error('❌ LeetMentor: Failed to enable voice - service not available');
        this.addMessage('❌ Voice service failed to initialize. Please check your browser permissions and refresh the page.', 'ai');
      }
    } else {
      // Disable voice
      console.log('🔇 LeetMentor: Disabling voice...');
      this.isVoiceEnabled = false;
      this.stopListening();
      
      if (this.voiceService && this.isSpeaking) {
        this.voiceService.stopSpeaking();
      }
      
      console.log('🔇 LeetMentor: Voice disabled');
      this.addMessage('🔇 Voice has been disabled. You can still type your responses.', 'ai');
    }
    
    this.updateVoiceStatus();
  }

  private async testMicrophone(): Promise<{success: boolean, error?: string}> {
    try {
      console.log('🎤 Testing microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      // Test if we can actually capture audio
      const mediaRecorder = new MediaRecorder(stream);
      let dataReceived = false;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          dataReceived = true;
        }
      };
      
      mediaRecorder.start();
      
      // Test for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      mediaRecorder.stop();
      
      // Stop all tracks to release microphone
      stream.getTracks().forEach(track => track.stop());
      
      if (!dataReceived) {
        return { success: false, error: 'No audio data received from microphone' };
      }
      
      console.log('✅ Microphone test successful');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Microphone test failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          return { success: false, error: 'Microphone permission denied. Please allow microphone access.' };
        } else if (error.name === 'NotFoundError') {
          return { success: false, error: 'No microphone found. Please connect a microphone.' };
        } else {
          return { success: false, error: `Microphone error: ${error.message}` };
        }
      }
      
      return { success: false, error: 'Unknown microphone error' };
    }
  }

  private async startListening() {
    if (!this.isVoiceEnabled || !this.voiceService) {
      console.warn('🎤 LeetMentor: Voice not enabled or service not available');
      return;
    }
    
    if (this.isListening) {
      console.log('🎤 LeetMentor: Already listening, skipping');
      return;
    }
    
    try {
      // Stop any current AI speech
      if (this.isSpeaking) {
        this.voiceService.stopSpeaking();
      }
      
      await this.voiceService.startListening({
        enabled: true,
        language: 'en-US',
        continuous: true, // Better for non-native speakers
        interimResults: true
      });
      console.log('🎤 LeetMentor: Started listening');
    } catch (error) {
      console.error('❌ LeetMentor: Error starting voice recognition:', error);
      // Show user-friendly error
      this.addMessage(`Voice recognition error: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your microphone permissions.`, 'ai');
    }
  }

  private stopListening() {
    if (this.voiceService && this.isListening) {
      this.voiceService.stopListening();
      console.log('🛑 LeetMentor: Stopped listening');
    }
  }

  private addSimpleMessage(content: string, role: 'user' | 'ai') {
    const messagesContainer = document.getElementById('leetmentor-messages-simple');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-bottom: 12px;
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      line-height: 1.4;
      ${role === 'user' 
        ? 'background: #3b82f6; color: white; margin-left: 40px; border-radius: 12px 12px 4px 12px;' 
        : 'background: #f3f4f6; color: #1f2937; border-left: 4px solid #3b82f6; margin-right: 40px;'
      }
    `;

    const prefix = role === 'user' ? '👤 You:' : '🤖 AI:';
    messageDiv.innerHTML = `<strong>${prefix}</strong><br>${content}`;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  private async initializeEmbeddedInterview() {
    if (!this.problem) {
      console.log('LeetMentor: No problem detected, waiting...');
      return;
    }

    console.log('LeetMentor: Initializing interview for problem:', this.problem.title);
    
    try {
      if (!this.isExtensionContextValid()) {
        console.warn('LeetMentor: Extension context invalid, using default config');
        this.embeddedConfig = this.getDefaultConfig();
      } else {
        const configResponse = await this.sendMessageSafely({ type: 'GET_CONFIG' });
        if (configResponse && configResponse.success && configResponse.data) {
          this.embeddedConfig = configResponse.data;
          console.log('✅ LeetMentor: Configuration loaded');
          
          // Initialize voice service if API key is available
          if (this.embeddedConfig.apiKey) {
            await this.initializeVoiceService();
          }
        } else {
          console.warn('LeetMentor: Failed to load config, using defaults');
          this.embeddedConfig = this.getDefaultConfig();
        }
      }
    } catch (error) {
      console.warn('LeetMentor: Error loading configuration:', error);
      this.embeddedConfig = this.getDefaultConfig();
    }
    
    // Add CSS animations to the page
    this.addCustomStyles();
  }

  private async sendMessageSafely(message: any): Promise<any> {
    try {
      if (!this.isExtensionContextValid()) {
        throw new Error('Extension context invalidated');
      }
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message timeout'));
        }, 5000);

        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    } catch (error) {
      console.warn('LeetMentor: Safe message send failed:', error);
      return null;
    }
  }

  private getDefaultConfig() {
    return {
      apiKey: '',
      model: 'gpt-4',
      voice: {
        enabled: false,
        language: 'en-US',
        rate: 1,
        pitch: 1,
        volume: 1
      }
    };
  }

  private addCustomStyles() {
    const existingStyles = document.getElementById('leetmentor-styles');
    if (existingStyles) return;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'leetmentor-styles';
    styleSheet.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes slideDown {
        from { opacity: 0; max-height: 0; }
        to { opacity: 1; max-height: 400px; }
      }
      
      .leetmentor-message-appear {
        animation: fadeIn 0.3s ease-out;
      }
      
      .leetmentor-interface-appear {
        animation: slideDown 0.4s ease-out;
      }
      
      .leetmentor-voice-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        background: #5856eb !important;
      }
      
      .leetmentor-voice-btn:active {
        transform: translateY(0);
      }
      
      /* Scrollbar styling */
      #leetmentor-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `;
    
    document.head.appendChild(styleSheet);
  }

  private conversationHistory: any[] = [];
  private voiceService: any = null;
  private isVoiceEnabled: boolean = false;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;

  private async handleUserMessage(content: string) {
    if (!content.trim()) return;

    console.log('LeetMentor: Handling user message:', content);
    
    // Add user message to both interfaces
    this.addMessage(content, 'user');
    this.addToConversationHistory(content, 'user');

    // Show thinking indicator
    this.addMessage('AI is thinking...', 'ai-thinking');

    try {
      if (!this.isExtensionContextValid()) {
        this.removeLastThinkingMessage();
        this.addMessage('The extension needs to be reloaded. Please refresh the page to continue using the AI interviewer.', 'ai');
        return;
      }

      if (!this.embeddedConfig || !this.embeddedConfig.apiKey) {
        this.removeLastThinkingMessage();
        this.addMessage('Please configure your OpenAI API key in the extension popup to enable the AI interviewer.', 'ai');
        return;
      }

      const response = await this.sendMessageSafely({
        type: 'HANDLE_EMBEDDED_MESSAGE',
        data: {
          problem: this.problem,
          message: content,
          config: this.embeddedConfig,
          conversationHistory: this.conversationHistory
        }
      });

      // Remove thinking indicator
      this.removeLastThinkingMessage();

      if (response && response.success && response.data) {
        const aiResponse = response.data.response;
        this.addMessage(aiResponse, 'ai');
        this.addToConversationHistory(aiResponse, 'assistant');

        // Speak the AI response if voice is enabled
        if (this.isVoiceEnabled && this.voiceService) {
          this.speakAIResponse(aiResponse);
        }
      } else {
        let errorMsg = 'Sorry, I encountered an error processing your message.';
        
        if (response && response.error) {
          if (response.error.includes('API key')) {
            errorMsg = 'Please configure your OpenAI API key in the extension popup.';
          } else if (response.error.includes('Extension context invalidated')) {
            errorMsg = 'The extension needs to be reloaded. Please refresh the page.';
          }
        }
        
        this.addMessage(errorMsg, 'ai');
      }
    } catch (error) {
      console.error('LeetMentor: Error handling user message:', error);
      this.removeLastThinkingMessage();
      
      let errorMsg = 'Sorry, I encountered an error. ';
      if (error instanceof Error && error.message.includes('invalidated')) {
        errorMsg += 'Please refresh the page to reload the extension.';
      } else {
        errorMsg += 'Please make sure your API key is configured in the extension popup.';
      }
      
      this.addMessage(errorMsg, 'ai');
    }
  }

  private addToConversationHistory(content: string, role: 'user' | 'assistant') {
    this.conversationHistory.push({ role, content });
    // Keep last 10 messages to avoid token limits
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  private addMessage(content: string, type: 'user' | 'ai' | 'ai-thinking') {
    // Try both container IDs for compatibility
    const containers = [
      document.getElementById('leetmentor-messages'),
      document.getElementById('leetmentor-messages-simple')
    ].filter(c => c !== null);

    containers.forEach(container => {
      if (container) {
        this.addMessageToContainer(container, content, type);
      }
    });
  }

  private addMessageToContainer(container: Element, content: string, type: 'user' | 'ai' | 'ai-thinking') {
    const messageDiv = document.createElement('div');
    messageDiv.dataset.messageType = type;
    messageDiv.className = 'leetmentor-message-appear';
    
    if (type === 'ai-thinking') {
      messageDiv.style.cssText = `
        margin-bottom: 12px;
        padding: 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
        background: #f3f4f6;
        color: #6b7280;
        border-left: 4px solid #3b82f6;
        margin-right: 40px;
        font-style: italic;
        animation: pulse 1s infinite;
      `;
      messageDiv.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><div class="loading-dots">🤖 AI is thinking</div><div style="display: flex; gap: 2px;"><span style="animation: pulse 0.6s infinite;">.</span><span style="animation: pulse 0.6s infinite 0.2s;">.</span><span style="animation: pulse 0.6s infinite 0.4s;">.</span></div></div>`;
    } else if (type === 'user') {
      messageDiv.style.cssText = `
        margin-bottom: 12px;
        padding: 14px 16px;
        border-radius: 18px 18px 6px 18px;
        font-size: 14px;
        line-height: 1.5;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        margin-left: 60px;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        position: relative;
      `;
      messageDiv.innerHTML = `<div style="display: flex; align-items: flex-start; gap: 8px;"><span style="font-size: 16px;">👤</span><div><strong>You</strong><br>${content}</div></div>`;
    } else {
      messageDiv.style.cssText = `
        margin-bottom: 12px;
        padding: 14px 16px;
        border-radius: 6px 18px 18px 18px;
        font-size: 14px;
        line-height: 1.5;
        background: linear-gradient(135deg, #f8fafc, #f1f5f9);
        color: #1f2937;
        border-left: 4px solid #3b82f6;
        margin-right: 60px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        position: relative;
      `;
      messageDiv.innerHTML = `<div style="display: flex; align-items: flex-start; gap: 8px;"><span style="font-size: 16px;">🤖</span><div><strong style="color: #3b82f6;">AI Interviewer</strong><br>${content}</div></div>`;
    }

    container.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    setTimeout(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }, 100);
  }

  private removeLastThinkingMessage() {
    const containers = [
      document.getElementById('leetmentor-messages'),
      document.getElementById('leetmentor-messages-simple')
    ].filter(c => c !== null);

    containers.forEach(container => {
      if (container) {
        const thinkingMessages = container.querySelectorAll('[data-message-type="ai-thinking"]');
        if (thinkingMessages.length > 0) {
          thinkingMessages[thinkingMessages.length - 1].remove();
        }
      }
    });
  }

  private async initializeVoiceService() {
    try {
      // Use static import (already imported at top)
      this.voiceService = new VoiceService();
      
      // Set up voice event handlers
      this.voiceService.onSpeechResult = (text: string, isFinal: boolean) => {
        this.handleVoiceInput(text, isFinal);
      };
      
      this.voiceService.onSpeechStart = () => {
        this.isListening = true;
        this.updateVoiceStatus();
      };
      
      this.voiceService.onSpeechEnd = () => {
        this.isListening = false;
        this.updateVoiceStatus();
      };
      
      this.voiceService.onSpeakStart = () => {
        this.isSpeaking = true;
        this.updateVoiceStatus();
      };
      
      this.voiceService.onSpeakEnd = () => {
        this.isSpeaking = false;
        this.updateVoiceStatus();
      };

      // Set API key if available
      if (this.embeddedConfig?.apiKey) {
        this.voiceService.setApiKey(this.embeddedConfig.apiKey);
      }

      console.log('✅ LeetMentor: Voice service initialized successfully');
    } catch (error) {
      console.error('❌ LeetMentor: Failed to initialize voice service:', error);
    }
  }

  private handleVoiceInput(text: string, isFinal: boolean) {
    console.log(`🎤 LeetMentor: Voice input - Final: ${isFinal}, Text: "${text}"`);
    
    // Show real-time feedback
    if (!isFinal && text.trim()) {
      // Show what we're hearing in real-time
      this.showVoiceTranscript(text, false);
    } else if (isFinal && text.trim()) {
      console.log('🎤 LeetMentor: Final voice input received:', text);
      this.showVoiceTranscript(text, true);
      // Give a small delay to show the final transcript
      setTimeout(() => {
        this.handleUserMessage(text);
      }, 500);
    }
  }

  private showVoiceTranscript(text: string, isFinal: boolean) {
    // Find or create a transcript display area
    let transcriptDiv = document.getElementById('leetmentor-voice-transcript');
    
    if (!transcriptDiv) {
      transcriptDiv = document.createElement('div');
      transcriptDiv.id = 'leetmentor-voice-transcript';
      transcriptDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 12px;
        font-family: monospace;
        font-size: 16px;
        max-width: 500px;
        text-align: center;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        display: none;
      `;
      document.body.appendChild(transcriptDiv);
    }

    if (this.isListening || isFinal) {
      transcriptDiv.style.display = 'block';
      transcriptDiv.innerHTML = `
        <div style="margin-bottom: 10px; color: #10b981;">
          ${isFinal ? '✅ Final:' : '🎤 Listening...'}
        </div>
        <div style="font-size: 18px; line-height: 1.4;">
          "${text}"
        </div>
        ${!isFinal ? '<div style="margin-top: 10px; font-size: 12px; opacity: 0.7;">Keep speaking...</div>' : ''}
      `;
      
      if (isFinal) {
        // Hide after showing final result
        setTimeout(() => {
          transcriptDiv!.style.display = 'none';
        }, 2000);
      }
    } else {
      transcriptDiv.style.display = 'none';
    }
  }

  private async speakAIResponse(text: string) {
    if (!this.isVoiceEnabled || !this.voiceService) {
      console.log('🔊 LeetMentor: Voice disabled or service not available, skipping speech');
      return;
    }

    try {
      console.log('🔊 LeetMentor: Speaking AI response:', text.substring(0, 50) + '...');
      
      const voiceSettings = {
        enabled: true,
        language: 'en-US',
        rate: 1.1, // Slightly faster for more natural speech
        pitch: 1.2, // Higher pitch for female voice
        volume: 0.9,
        voice: 'female', // Request female voice
        ...this.embeddedConfig?.voice
      };
      
      await this.voiceService.speak(text, voiceSettings);
      console.log('✅ LeetMentor: Finished speaking AI response');
    } catch (error) {
      console.error('❌ LeetMentor: Error speaking AI response:', error);
      // Show user-friendly error
      this.addMessage(`Text-to-speech error: ${error instanceof Error ? error.message : 'Unknown error'}. Voice may not be available in your browser.`, 'ai');
    }
  }

  private updateVoiceStatus() {
    const voiceButtons = document.querySelectorAll('.leetmentor-voice-btn');
    voiceButtons.forEach(btn => {
      const element = btn as HTMLElement;
      if (this.isListening) {
        element.style.background = '#ef4444';
        element.innerHTML = '🔴 Listening...';
      } else if (this.isSpeaking) {
        element.style.background = '#3b82f6';
        element.innerHTML = '🔊 Speaking...';
      } else {
        element.style.background = '#6366f1'; // Indigo color
        element.innerHTML = '🎤 Push to Talk';
      }
    });
  }

  private setupSpacebarPushToTalk(startVoiceCapture: () => void, stopVoiceCapture: () => void) {
    let spaceHeld = false;
    let isTextInputFocused = false;
    
    // Track if text input is focused
    const textInput = document.getElementById('leetmentor-text-input');
    if (textInput) {
      textInput.addEventListener('focus', () => {
        isTextInputFocused = true;
      });
      textInput.addEventListener('blur', () => {
        isTextInputFocused = false;
      });
    }

    // Global keydown listener
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate spacebar PTT when text input is NOT focused
      if (e.code === 'Space' && !isTextInputFocused && !spaceHeld) {
        e.preventDefault();
        spaceHeld = true;
        startVoiceCapture();
        
        // Visual feedback - highlight the push to talk button
        const voiceButtons = document.querySelectorAll('.leetmentor-voice-btn');
        voiceButtons.forEach(btn => {
          const element = btn as HTMLElement;
          element.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.5)';
          element.style.transform = 'scale(1.05)';
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeld) {
        e.preventDefault();
        spaceHeld = false;
        stopVoiceCapture();
        
        // Remove visual feedback
        const voiceButtons = document.querySelectorAll('.leetmentor-voice-btn');
        voiceButtons.forEach(btn => {
          const element = btn as HTMLElement;
          element.style.boxShadow = '0 2px 4px rgba(99, 102, 241, 0.3)';
          element.style.transform = 'scale(1)';
        });
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Store cleanup function for later
    this.cleanupSpacebarListener = () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };

    console.log('✅ LeetMentor: Spacebar push-to-talk enabled (when text input not focused)');
  }

  private cleanupSpacebarListener?: () => void;

  private injectSimpleTestButton() {
    console.log('🔧 LeetMentor: Injecting test button...');
    
    const testButton = document.createElement('div');
    testButton.id = 'leetmentor-test-button';
    testButton.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
      ">
        🎤 LeetMentor Test Button!
      </div>
    `;

    testButton.addEventListener('click', () => {
      alert('Extension is working! Trying to inject interface...');
      this.tryFallbackInjection();
    });

    document.body.appendChild(testButton);
    console.log('✅ Test button injected');
  }
}

console.log('🔥 DEBUG: Script reached initialization section');

let detectorInstance: LeetCodeDetector | null = null;

function initializeLeetMentor() {
  console.log('🔥 DEBUG: initializeLeetMentor function called!');
  console.log('🚀 LeetMentor: Initializing detector...');
  
  try {
    if (detectorInstance) {
      console.log('🔄 LeetMentor: Cleaning up existing instance...');
    }
    console.log('🔥 DEBUG: About to create new LeetCodeDetector...');
    detectorInstance = new LeetCodeDetector();
    console.log('🔥 DEBUG: LeetCodeDetector created successfully!');
  } catch (error) {
    console.error('❌ LeetMentor: Failed to initialize:', error);
  }
}

if (document.readyState === 'loading') {
  console.log('📄 LeetMentor: Document loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initializeLeetMentor);
} else {
  console.log('📄 LeetMentor: Document ready, initializing immediately...');
  setTimeout(initializeLeetMentor, 100);
}

setTimeout(() => {
  if (!detectorInstance) {
    console.log('🔄 LeetMentor: Backup initialization...');
    initializeLeetMentor();
  }
}, 3000);
