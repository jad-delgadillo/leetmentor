console.log('🔥 DEBUG: Content script starting...');

import { LeetCodeProblem, TestCase, CodeSnippet } from '../types/leetcode';
import { VoiceService } from '../shared/voice-service';
import { RealtimeVoiceService } from '../shared/realtime-voice-service';

console.log('🔥 DEBUG: All imports completed successfully');

console.log('🔥 DEBUG: About to define LeetCodeDetector class...');

// Content script for LeetCode problem detection
class LeetCodeDetector {
  private problem: LeetCodeProblem | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;
  private embeddedConfig: any = null;
  
  // Voice services
  private voiceService: VoiceService;
  private realtimeService: RealtimeVoiceService;
  private isVoiceEnabled: boolean = false;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private useRealtimeAPI: boolean = false;
  private currentTranscript: string = '';

  constructor() {
    console.log('🔥 DEBUG: LeetCodeDetector constructor called!');
    console.log('🚀 LeetMentor: Content script initializing on', window.location.href);
    console.log('🔍 LeetMentor: DOM ready state:', document.readyState);
    console.log('🔍 LeetMentor: Page title:', document.title);
    
    // Add immediate visual indicator that the extension is running
    this.showExtensionRunningIndicator();
    
    // Focus on the real interface injection
    
    this.currentUrl = window.location.href;
    
    try {
      console.log('📡 LeetMentor: Setting up event listeners...');
      this.setupMessageListener();
      this.setupDOMObserver();
      this.setupURLWatcher();
      
      console.log('🗑️ LeetMentor: Clearing old cache...');
      this.clearOldCache();
      
      // Initialize voice services after basic setup
      console.log('🎤 LeetMentor: Initializing voice services...');
      try {
        this.voiceService = new VoiceService();
        this.realtimeService = new RealtimeVoiceService();
        this.setupVoiceEventHandlers();
        console.log('✅ LeetMentor: Voice services initialized successfully');
      } catch (voiceError) {
        console.warn('⚠️ LeetMentor: Voice services failed to initialize:', voiceError);
        console.log('📱 LeetMentor: Continuing without voice features...');
        // Continue without voice features
      }
      
      // Try injection with multiple strategies for better reliability
      this.tryMultipleInjectionStrategies();
    } catch (error) {
      console.error('❌ LeetMentor: Error during initialization:', error);
      // Fallback: try to inject a simple button to test
      this.injectSimpleTestButton();
    }
  }

  private setupVoiceEventHandlers() {
    if (!this.voiceService || !this.realtimeService) {
      console.warn('⚠️ LeetMentor: Voice services not available, skipping event handler setup');
      return;
    }
    
    // Traditional voice service event handlers
    this.voiceService.onSpeechResultReceived((text, isFinal) => {
      this.currentTranscript = isFinal ? '' : text;
      this.updateTranscriptDisplay();
      
      if (isFinal && text.trim()) {
        console.log('LeetMentor Voice: Final speech result received:', text);
        this.handleUserMessage(text.trim());
      }
    });

    this.voiceService.onSpeechStarted(() => {
      this.isListening = true;
      this.updateVoiceUI();
    });

    this.voiceService.onSpeechEnded(() => {
      this.isListening = false;
      this.updateVoiceUI();
    });

    this.voiceService.onSpeakStarted(() => {
      this.isSpeaking = true;
      this.updateVoiceUI();
    });

    this.voiceService.onSpeakEnded(() => {
      this.isSpeaking = false;
      this.updateVoiceUI();
    });

    this.voiceService.onSpeechErrorOccurred((error) => {
      console.error('LeetMentor Voice: Speech error:', error);
      this.isListening = false;
      this.updateVoiceUI();
    });

    // Realtime voice service event handlers
    this.realtimeService.setEventHandlers({
      onSpeechResult: (text: string, isFinal: boolean) => {
        this.currentTranscript = isFinal ? '' : text;
        this.updateTranscriptDisplay();
        
        if (isFinal && text.trim()) {
          console.log('LeetMentor Realtime: Speech result received:', text);
          this.handleUserMessage(text.trim());
        }
      },
      onSpeechStart: () => {
        this.isListening = true;
        this.updateVoiceUI();
      },
      onSpeechEnd: () => {
        this.isListening = false;
        this.updateVoiceUI();
      },
      onSpeakStart: () => {
        this.isSpeaking = true;
        this.updateVoiceUI();
      },
      onSpeakEnd: () => {
        this.isSpeaking = false;
        this.updateVoiceUI();
      },
      onSpeechError: (error: string) => {
        console.error('LeetMentor Realtime: Speech error:', error);
        this.isListening = false;
        this.updateVoiceUI();
      }
    });
  }

  private setupMessageListener() {
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
  }

  private setupDOMObserver() {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if problem content has loaded
          if (this.isProblemContentLoaded()) {
            this.detectCurrentProblem();
          }
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private setupURLWatcher() {
    // Watch for URL changes (LeetCode is a SPA)
    this.urlCheckInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.currentUrl) {
        console.log('LeetMentor: URL changed from', this.currentUrl, 'to', currentUrl);
        this.currentUrl = currentUrl;
        this.handleNavigation();
      }
    }, 500);

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      console.log('LeetMentor: Popstate event detected');
      setTimeout(() => this.handleNavigation(), 100);
    });

    // Listen for pushstate/replacestate (programmatic navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => {
        window.dispatchEvent(new Event('urlchange'));
      }, 0);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => {
        window.dispatchEvent(new Event('urlchange'));
      }, 0);
    };

    window.addEventListener('urlchange', () => {
      console.log('LeetMentor: URL change event detected');
      setTimeout(() => this.handleNavigation(), 100);
    });
  }

  public async clearOldCache() {
    // Clear any existing cached problem data when loading a new page
    try {
      await chrome.storage.local.remove(['leetmentor_current_problem', 'leetmentor_problem_timestamp']);
      console.log('LeetMentor: Cleared old cached problem data');
    } catch (error) {
      console.warn('LeetMentor: Failed to clear cache:', error);
    }
  }

  // Cleanup method to prevent memory leaks
  public cleanup() {
    console.log('LeetMentor: Cleaning up content script...');
    
    // Stop voice services
    this.stopListening();
    this.stopSpeaking();
    
    // Cleanup voice services
    if (this.voiceService) {
      this.voiceService.destroy();
    }
    if (this.realtimeService) {
      this.realtimeService.disconnect();
    }
    
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    // Clear any cached data on cleanup
    this.clearOldCache().catch(error => {
      console.warn('LeetMentor: Failed to clear cache during cleanup:', error);
    });
  }

  private handleNavigation() {
    console.log('LeetMentor: Handling navigation to', window.location.href);
    
    // Clear cache when navigating
    this.clearOldCache();
    
    // Reset current problem
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
        // Always update if we have a new problem, even if the ID is the same
        // This handles cases where the content changes but the URL slug doesn't
        const isNewProblem = !this.problem || 
                            problem.id !== this.problem.id || 
                            problem.title !== this.problem.title ||
                            problem.url !== this.problem.url;
        
        if (isNewProblem) {
          console.log('LeetMentor: Detected new/updated problem:', problem.title, 'ID:', problem.id);
          
          // Clear old cache before setting new problem
          await this.clearOldCache();
          
          this.problem = problem;
          this.initializeEmbeddedInterview();
          
                // Store the new problem immediately to prevent stale data
      await chrome.storage.local.set({
        'leetmentor_current_problem': problem,
        'leetmentor_problem_timestamp': Date.now()
      });
      
      console.log('LeetMentor: ✅ Cached new problem data');
      console.log('  - Title:', problem.title);
      console.log('  - ID:', problem.id);
      console.log('  - URL:', problem.url);
      console.log('  - Description length:', problem.description?.length || 0, 'chars');
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
    
    // Extract problem title - try multiple selectors for different LeetCode layouts
    const titleElement = document.querySelector('[data-cy="question-title"]') || 
                        document.querySelector('.css-v3d350') ||
                        document.querySelector('[class*="question-title"]') ||
                        document.querySelector('h1') ||
                        document.querySelector('[class*="title"]') ||
                        document.querySelector('.text-title-large') ||
                        document.querySelector('[data-e2e-locator="console-question-title"]') ||
                        document.querySelector('div[class*="title"]');
    
    console.log('LeetMentor: Found title element:', titleElement);
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

    // Extract problem description - try multiple selectors for different LeetCode layouts
    const descriptionSelectors = [
      // Modern LeetCode selectors
      '[data-track-load="description_content"]',
      '[data-e2e-locator="console-question-detail-description"]',
      '[class*="question-content"]',
      '[class*="description"]',
      '[class*="question-detail"]',
      '[class*="problem-content"]',
      '.elfjS', // Sometimes used by LeetCode
      '.content__u3I1',
      '.question-content__JfgR',
      '[data-key="description-content"]',
      // Fallback selectors
      '.css-5ifiuz', // Common LeetCode class
      '.css-q9153y', // Another common class
      '.css-16knbip', // Problem content container
      'div[class*="content"] p' // Generic content paragraphs
    ];

    let descriptionElement: Element | null = null;
    for (const selector of descriptionSelectors) {
      descriptionElement = document.querySelector(selector);
      if (descriptionElement && descriptionElement.textContent?.trim()) {
        console.log(`LeetMentor: Found description using selector: ${selector}`);
        break;
      }
    }

    let description = '';
    if (descriptionElement) {
      // Get text content and clean it up
      description = descriptionElement.textContent?.trim() || '';
      // Remove common unwanted prefixes
      description = description.replace(/^(Description|Problem\s*:|Problem\s+Statement)/i, '').trim();
    } else {
      console.warn('LeetMentor: Could not find problem description element');
      // Try to extract from the first paragraph of the problem area
      const paragraphs = document.querySelectorAll('p');
      for (const p of paragraphs) {
        const text = p.textContent?.trim() || '';
        if (text.length > 50 && !text.includes('Example') && !text.includes('Input:') && !text.includes('Output:')) {
          description = text;
          console.log('LeetMentor: Found description in paragraph fallback');
          break;
        }
      }
    }

    console.log('LeetMentor: Extracted description:', description.substring(0, 100) + '...');

    // Extract example test cases
    const exampleTestCases = this.extractExampleTestCases();

    // Extract topic tags
    const topicTags = this.extractTopicTags();

    // Extract code snippets
    const codeSnippets = this.extractCodeSnippets();

    // Generate problem ID from title slug
    const id = titleSlug;

    return {
      id,
      title,
      titleSlug,
      difficulty,
      description,
      exampleTestCases,
      constraints: [],
      hints: [],
      topicTags,
      companyTags: [],
      url,
      codeSnippets,
      similarQuestions: []
    };
  }

  private extractExampleTestCases(): TestCase[] {
    const testCases: TestCase[] = [];
    
    // Try multiple approaches to find examples
    const exampleSelectors = [
      '[class*="example"]',
      '.example',
      '[data-e2e-locator*="example"]',
      '.css-example',
      'div:contains("Example")',
      'strong:contains("Example")',
      'h3:contains("Example")',
      'pre' // Sometimes examples are in <pre> tags
    ];

    // First try: Look for explicit example sections
    exampleSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element, index) => {
          const text = element.textContent || '';
          if (text.toLowerCase().includes('example') || text.includes('Input:') || text.includes('Output:')) {
            this.parseExampleText(text, testCases);
          }
        });
      } catch (e) {
        // Skip selectors that cause errors
      }
    });

    // Second try: Look for Input/Output patterns in the whole document
    if (testCases.length === 0) {
      const allText = document.body.textContent || '';
      this.parseExampleText(allText, testCases);
    }

    console.log(`LeetMentor: Extracted ${testCases.length} test cases`);
    return testCases;
  }

  private parseExampleText(text: string, testCases: TestCase[]): void {
    // More robust regex patterns for examples
    const examplePattern = /Example\s*\d*:?\s*[\s\S]*?Input:\s*(.+?)[\s\S]*?Output:\s*(.+?)(?:\s*Explanation:\s*([\s\S]*?))?(?=Example\s*\d*:|$)/gi;
    
    let match;
    while ((match = examplePattern.exec(text)) !== null) {
      const input = match[1]?.trim();
      const output = match[2]?.trim();
      const explanation = match[3]?.trim();

      if (input && output) {
        testCases.push({
          input: input.replace(/\n\s*/g, ' ').trim(),
          output: output.replace(/\n\s*/g, ' ').trim(),
          explanation: explanation || undefined
        });
      }
    }

    // Fallback: Look for standalone Input/Output pairs
    if (testCases.length === 0) {
      const inputOutputPattern = /Input:\s*(.+?)[\s\S]*?Output:\s*(.+?)(?:\s*Explanation:\s*([\s\S]*?))?(?=Input:|$)/gi;
      
      let ioMatch;
      while ((ioMatch = inputOutputPattern.exec(text)) !== null) {
        const input = ioMatch[1]?.trim();
        const output = ioMatch[2]?.trim();
        const explanation = ioMatch[3]?.trim();

        if (input && output) {
          testCases.push({
            input: input.replace(/\n\s*/g, ' ').trim(),
            output: output.replace(/\n\s*/g, ' ').trim(),
            explanation: explanation || undefined
          });
        }
      }
    }
  }

  private extractTopicTags(): string[] {
    const tags: string[] = [];
    
    // Look for topic tag elements
    const tagElements = document.querySelectorAll('[class*="topic-tag"], .tag, [class*="tag"]');
    
    tagElements.forEach(element => {
      const tagText = element.textContent?.trim();
      if (tagText && !tags.includes(tagText)) {
        tags.push(tagText);
      }
    });

    return tags;
  }

  private extractCodeSnippets(): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    
    // This would need to be implemented based on LeetCode's code editor structure
    // For now, return empty array as it requires more complex DOM parsing
    
    return snippets;
  }

  private injectInterviewInterface() {
    console.log('🔍 LeetMentor: Starting interface injection...');

    // Remove existing interface if present
    const existingInterface = document.getElementById('leetmentor-interview-interface');
    if (existingInterface) {
        console.log('🗑️ LeetMentor: Removing existing interface');
        existingInterface.remove();
    }

    // Create the interview interface container
    const interfaceContainer = document.createElement('div');
    interfaceContainer.id = 'leetmentor-interview-interface';
    interfaceContainer.style.cssText = `
        position: fixed;
        top: 80px; 
        right: 20px;
        width: 480px;
        height: 75vh;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: translateX(100%);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Create header with toggle button
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #e2e8f0;
        background: white;
        flex-shrink: 0;
    `;

    const title = document.createElement('h3');
    title.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="display: inline; margin-right: 10px; color: #3b82f6;">
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        AI Interview Assistant
    `;
    title.style.cssText = `
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        display: flex;
        align-items: center;
    `;

    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
        background: #e2e8f0;
        color: #475569;
        border: none;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
    `;
    closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = '#ef4444';
        closeButton.style.color = 'white';
        closeButton.style.transform = 'rotate(90deg)';
    };
    closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = '#e2e8f0';
        closeButton.style.color = '#475569';
        closeButton.style.transform = 'rotate(0deg)';
    };

    header.appendChild(title);
    header.appendChild(closeButton);

    // Create chat interface
    const chatInterface = this.createChatInterface();
    chatInterface.style.flex = '1';
    chatInterface.style.display = 'flex';
    chatInterface.style.flexDirection = 'column';

    interfaceContainer.appendChild(header);
    interfaceContainer.appendChild(chatInterface);

    // Append to body and animate in
    document.body.appendChild(interfaceContainer);
    setTimeout(() => {
        interfaceContainer.style.transform = 'translateX(0)';
    }, 50);

    // Set up close functionality
    closeButton.addEventListener('click', () => {
        interfaceContainer.style.transform = 'translateX(100%)';
        setTimeout(() => interfaceContainer.remove(), 400);
    });

    // Add CSS for animations and scrollbars
    this.injectVoiceCSS();

    // Initialize the interview
    this.initializeEmbeddedInterview();

    console.log('LeetMentor: Successfully injected interview interface as a fixed panel');
}

  private findProblemDescriptionContainer(): Element | null {
    console.log('🔍 LeetMentor: Searching for problem description container...');
    console.log('🔍 LeetMentor: Current URL:', window.location.href);
    console.log('🔍 LeetMentor: Page title:', document.title);
    
    // Log all potential containers we can see
    this.logDOMStructure();
    
    // Try multiple selectors to find the problem description container
    const selectors = [
      // Modern LeetCode selectors (2024)
      '.css-1jqueqk', // New LeetCode layout
      '[data-cy="question-content"]',
      '[class*="question-content"]',
      '[class*="description-content"]',
      
      // Legacy selectors
      '[data-track-load="description_content"]',
      '[data-e2e-locator="console-question-detail-description"]',
      '[class*="description"]',
      '[class*="question-detail"]',
      '[class*="problem-content"]',
      '.elfjS',
      '.content__u3I1',
      '.question-content__JfgR',
      '[data-key="description-content"]',
      
      // Generic content containers
      '.content',
      '#content',
      '.main-content',
      '[role="main"]',
      'main'
    ];

    for (const selector of selectors) {
      console.log(`🔍 LeetMentor: Trying selector: ${selector}`);
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ LeetMentor: Found element with selector ${selector}:`, element);
        console.log(`  - Element tag: ${element.tagName}`);
        console.log(`  - Element classes: ${element.className}`);
        console.log(`  - Element id: ${element.id}`);
        console.log(`  - Text content length: ${element.textContent?.length || 0}`);
        
        // Return the element itself, not its parent - we'll inject directly
        return element;
      } else {
        console.log(`❌ LeetMentor: No element found for selector: ${selector}`);
      }
    }

    console.log('❌ LeetMentor: Could not find any suitable container');
    return null;
  }

  private logDOMStructure() {
    console.log('🔍 LeetMentor: DOM Structure Analysis:');
    
    // Check for common container patterns
    const patterns = [
      'div[class*="content"]',
      'div[class*="description"]', 
      'div[class*="question"]',
      'div[class*="problem"]',
      'main',
      '[role="main"]',
      '#app',
      '#root',
      '#__next'
    ];
    
    patterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      console.log(`  ${pattern}: ${elements.length} found`);
      if (elements.length > 0 && elements.length < 5) {
        elements.forEach((el, i) => {
          console.log(`    [${i}] classes: ${el.className}, id: ${el.id}`);
        });
      }
    });
    
    // Check if body has children
    console.log(`  Body children: ${document.body?.children.length || 0}`);
    if (document.body?.children.length) {
      Array.from(document.body.children).slice(0, 5).forEach((child, i) => {
        console.log(`    [${i}] ${child.tagName} - classes: ${child.className}, id: ${child.id}`);
      });
    }
  }

  private tryFallbackInjection() {
    console.log('🔄 LeetMentor: Attempting fallback injection methods...');
    
    // Force inject the interface anywhere we can
    const containers = [
      document.body,
      document.documentElement,
      document.querySelector('#app'),
      document.querySelector('#root'),
      document.querySelector('#__next'),
      document.querySelector('main')
    ].filter(Boolean);

    if (containers.length > 0) {
      console.log('🔧 LeetMentor: Force injecting interface into first available container');
      this.createAndInjectSimpleInterface(containers[0] as Element);
    } else {
      console.error('❌ LeetMentor: Could not find any suitable container!');
    }
  }

  private createAndInjectSimpleInterface(container: Element) {
    console.log('🔧 LeetMentor: Creating simple AI interface...');
    
    // Remove existing interface
    const existing = document.getElementById('leetmentor-simple-interface');
    if (existing) {
      existing.remove();
    }
    
    // Create a simple but functional AI interface
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

    // Create the interface HTML
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
        <div style="display: flex; align-items: center; gap: 8px;">
          🤖 AI Interview Assistant
          <span style="background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 8px; font-size: 11px;">ACTIVE</span>
        </div>
        <button id="leetmentor-close-btn" style="
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
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
          Hello! I'm your AI interviewer. I can see this LeetCode problem. Let's start by having you explain the problem in your own words. What do you understand about what we need to solve?
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
              white-space: nowrap;
            "
          >Send</button>
        </div>
        <div style="
          font-size: 12px;
          color: #6b7280;
          text-align: center;
        ">
          💡 Monitoring your LeetCode submissions for feedback
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = interfaceContainer.querySelector('#leetmentor-close-btn');
    const sendBtn = interfaceContainer.querySelector('#leetmentor-send-btn');
    const input = interfaceContainer.querySelector('#leetmentor-input-simple') as HTMLTextAreaElement;

    closeBtn?.addEventListener('click', () => {
      interfaceContainer.remove();
    });

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

    // Inject into container
    container.appendChild(interfaceContainer);
    
    console.log('✅ LeetMentor: Simple AI interface injected successfully!');

    // Initialize the interview
    this.initializeEmbeddedInterview();
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

  private tryMultipleInjectionStrategies() {
    console.log('🔄 LeetMentor: Trying multiple injection strategies...');
    
    // Strategy 1: Immediate injection (for already loaded pages)
    setTimeout(() => {
      console.log('💉 LeetMentor: Strategy 1 - Immediate injection attempt...');
      this.attemptInjection();
    }, 100);
    
    // Strategy 2: Short delay (for loading pages) 
    setTimeout(() => {
      console.log('💉 LeetMentor: Strategy 2 - Short delay injection attempt...');
      this.attemptInjection();
    }, 1000);
    
    // Strategy 3: Medium delay (for slow pages)
    setTimeout(() => {
      console.log('💉 LeetMentor: Strategy 3 - Medium delay injection attempt...');
      this.attemptInjection();
    }, 3000);
    
    // Strategy 4: Long delay (final attempt)
    setTimeout(() => {
      console.log('💉 LeetMentor: Strategy 4 - Final injection attempt...');
      this.forceInjection();
    }, 5000);
  }

  private attemptInjection() {
    // Check if already injected
    if (document.getElementById('leetmentor-interview-interface') || 
        document.getElementById('leetmentor-simple-interface')) {
      console.log('✅ LeetMentor: Interface already exists, skipping injection');
      return;
    }
    
    console.log('🔍 LeetMentor: Attempting injection...');
    this.injectInterviewInterface();
    this.detectCurrentProblem();
  }

  private forceInjection() {
    // Check if already injected
    if (document.getElementById('leetmentor-interview-interface') || 
        document.getElementById('leetmentor-simple-interface')) {
      console.log('✅ LeetMentor: Interface already exists, skipping force injection');
      return;
    }
    
    console.log('🔧 LeetMentor: Force injection - using fallback method');
    this.tryFallbackInjection();
    this.detectCurrentProblem();
  }

  private showExtensionRunningIndicator() {
    console.log('🔧 LeetMentor: Adding extension running indicator...');
    
    // Create immediate visual indicator
    const indicator = document.createElement('div');
    indicator.id = 'leetmentor-running-indicator';
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
        animation: leetmentor-slide-in 0.5s ease-out;
      ">
        ✅ LeetMentor Extension Active
      </div>
      <style>
        @keyframes leetmentor-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;

    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      indicator.style.animation = 'leetmentor-slide-out 0.5s ease-out forwards';
      indicator.style.setProperty('--slide-out', 'translateX(100%)');
      setTimeout(() => indicator.remove(), 500);
    }, 3000);
    
    console.log('✅ LeetMentor: Extension running indicator added');
  }

  private injectSimpleTestButton() {
    console.log('🔧 LeetMentor: Injecting simple test button...');
    
    // Create a simple, highly visible test button
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
        border: 2px solid #fff;
        animation: leetmentor-pulse 2s infinite;
      ">
        🎤 LeetMentor Active!
        <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
          Click to test interface
        </div>
      </div>
      <style>
        @keyframes leetmentor-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      </style>
    `;

    testButton.addEventListener('click', () => {
      console.log('🎯 LeetMentor: Test button clicked!');
      alert('LeetMentor is active!\n\nIf you can see this, the content script is working.\nTrying to inject full interface...');
      this.forceInjectInterface();
    });

    document.body.appendChild(testButton);
    console.log('✅ LeetMentor: Test button injected successfully');
  }

  private forceInjectInterface() {
    console.log('🔧 LeetMentor: Force injecting interface...');
    
    // Find any reasonable container and inject there
    const containers = [
      document.querySelector('main'),
      document.querySelector('[role="main"]'),
      document.querySelector('#__next'),
      document.querySelector('.content'),
      document.querySelector('body > div'),
      document.body
    ];

    for (const container of containers) {
      if (container) {
        console.log('🎯 LeetMentor: Force injecting into container:', container);
        this.createAndInjectFullInterface(container);
        return;
      }
    }
  }

  private createAndInjectFullInterface(container: Element) {
    console.log('🔧 LeetMentor: Creating full interface in container:', container);
    
    // Create a simplified but visible interface
    const interfaceContainer = document.createElement('div');
    interfaceContainer.id = 'leetmentor-interview-interface';
    interfaceContainer.style.cssText = `
      position: relative;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      border: 2px solid #3b82f6;
      border-radius: 12px;
      margin: 20px;
      padding: 20px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 1000;
    `;

    interfaceContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937; display: flex; align-items: center; gap: 10px;">
          🎤 AI Interview Assistant
          <span style="background: #10b981; color: white; font-size: 12px; padding: 4px 8px; border-radius: 12px;">ACTIVE</span>
        </h3>
        <button onclick="this.parentElement.parentElement.remove()" style="background: #ef4444; color: white; border: none; border-radius: 6px; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">×</button>
      </div>
      
      <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0; margin-bottom: 15px;">
        <div style="color: #3b82f6; font-weight: 500; margin-bottom: 10px;">🤖 AI Interviewer:</div>
        <div style="color: #1f2937; line-height: 1.5;">
          Hello! I'm your AI interviewer. I can see this LeetCode problem page. Let's start by having you explain the problem in your own words. What do you understand about what we need to solve?
        </div>
      </div>
      
      <div style="background: white; border-radius: 8px; padding: 15px; border: 1px solid #e2e8f0;">
        <textarea 
          placeholder="Type your response here..." 
          style="width: 100%; height: 80px; border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; font-family: inherit; resize: vertical;"
        ></textarea>
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <button style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 14px;">Send Message</button>
            <button style="background: #10b981; color: white; border: none; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 14px;">🎤 Voice</button>
          </div>
          <div style="font-size: 12px; color: #6b7280;">
            LeetMentor is monitoring your submissions for feedback
          </div>
        </div>
      </div>
    `;

    container.insertBefore(interfaceContainer, container.firstChild);
    console.log('✅ LeetMentor: Full interface injected successfully!');
  }

  private injectVoiceCSS() {
    // Only inject once
    if (document.getElementById('leetmentor-voice-css')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'leetmentor-voice-css';
    style.textContent = `
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      .leetmentor-pulse {
        animation: pulse 1s infinite;
      }
      
      /* Custom scrollbar for messages area */
      #leetmentor-messages::-webkit-scrollbar {
        width: 6px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-track {
        background: #f1f5f9;
        border-radius: 3px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
      
      #leetmentor-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    `;
    
    document.head.appendChild(style);
  }

  private createChatInterface(): HTMLDivElement {
    const chatContainer = document.createElement('div');
    chatContainer.style.cssText = `
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 12px;
      overflow: hidden;
      max-height: 400px;
      display: flex;
      flex-direction: column;
    `;

    // Messages area
    const messagesArea = document.createElement('div');
    messagesArea.id = 'leetmentor-messages';
    messagesArea.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      min-height: 200px;
      max-height: 300px;
      border-bottom: 1px solid #e2e8f0;
    `;

    // Add welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.style.cssText = `
      background: #f1f5f9;
      border-left: 4px solid #3b82f6;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 0 8px 8px 0;
      font-size: 14px;
      line-height: 1.4;
    `;
    welcomeMessage.textContent = "Hello! I'm your AI interviewer. Let's start by having you explain this problem in your own words. What do you understand about what we need to solve?";
    messagesArea.appendChild(welcomeMessage);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 12px;
      background: #f8fafc;
      display: flex;
      gap: 8px;
      align-items: flex-end;
    `;

    const textInput = document.createElement('textarea');
    textInput.placeholder = 'Type your response...';
    textInput.style.cssText = `
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 14px;
      resize: none;
      font-family: inherit;
      max-height: 80px;
      min-height: 36px;
    `;

    const sendButton = document.createElement('button');
    sendButton.innerHTML = '→';
    sendButton.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      width: 36px;
      height: 36px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    `;

    sendButton.addEventListener('click', () => {
      this.handleUserMessage(textInput.value.trim());
      textInput.value = '';
      this.autoResizeTextarea(textInput);
    });

    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
      }
    });

    textInput.addEventListener('input', () => {
      this.autoResizeTextarea(textInput);
    });

    inputArea.appendChild(textInput);
    inputArea.appendChild(sendButton);

    // Voice controls area
    const voiceControlsArea = this.createVoiceControls();

    chatContainer.appendChild(messagesArea);
    chatContainer.appendChild(inputArea);
    chatContainer.appendChild(voiceControlsArea);

    return chatContainer;
  }

  private createSubmissionMonitor(): HTMLDivElement {
    const monitorContainer = document.createElement('div');
    monitorContainer.style.cssText = `
      background: white;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 12px;
    `;

    const statusText = document.createElement('div');
    statusText.id = 'leetmentor-submission-status';
    statusText.style.cssText = `
      font-size: 14px;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    statusText.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Monitoring LeetCode submissions... Run your tests and I'll provide feedback!
    `;

    monitorContainer.appendChild(statusText);

    // Start monitoring submissions
    this.startSubmissionMonitoring();

    return monitorContainer;
  }

  private createVoiceControls(): HTMLDivElement {
    const voiceContainer = document.createElement('div');
    voiceContainer.id = 'leetmentor-voice-controls';
    voiceContainer.style.cssText = `
      padding: 12px;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `;

    // Voice status indicator
    const statusArea = document.createElement('div');
    statusArea.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    `;

    const statusDot = document.createElement('div');
    statusDot.id = 'leetmentor-voice-status-dot';
    statusDot.style.cssText = `
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #94a3b8;
      transition: all 0.2s;
    `;

    const statusText = document.createElement('span');
    statusText.id = 'leetmentor-voice-status-text';
    statusText.style.cssText = `
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    `;
    statusText.textContent = 'Voice Ready';

    // Transcript preview
    const transcriptPreview = document.createElement('div');
    transcriptPreview.id = 'leetmentor-transcript-preview';
    transcriptPreview.style.cssText = `
      font-size: 12px;
      color: #3b82f6;
      font-style: italic;
      margin-left: 8px;
      opacity: 0;
      transition: opacity 0.2s;
    `;

    statusArea.appendChild(statusDot);
    statusArea.appendChild(statusText);
    statusArea.appendChild(transcriptPreview);

    // Voice control buttons
    const buttonArea = document.createElement('div');
    buttonArea.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
    `;

    // Microphone button
    const micButton = document.createElement('button');
    micButton.id = 'leetmentor-mic-button';
    micButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    micButton.style.cssText = `
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0;
    `;
    micButton.title = 'Start voice input (Space key)';

    // Stop speaking button (initially hidden)
    const stopButton = document.createElement('button');
    stopButton.id = 'leetmentor-stop-button';
    stopButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2"/>
        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    stopButton.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      cursor: pointer;
      display: none;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0;
    `;
    stopButton.title = 'Stop AI speaking';

    // Speed control container
    const speedContainer = document.createElement('div');
    speedContainer.id = 'leetmentor-speed-container';
    speedContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      background: #f1f5f9;
      border-radius: 6px;
      padding: 4px;
    `;

    // Speed label
    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'Speed:';
    speedLabel.style.cssText = `
      font-size: 10px;
      color: #64748b;
      font-weight: 500;
      margin-right: 2px;
    `;

    // Speed buttons container
    const speedButtonsContainer = document.createElement('div');
    speedButtonsContainer.style.cssText = `
      display: flex;
      gap: 2px;
    `;

    // Create speed buttons
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const speedButtons: HTMLButtonElement[] = [];

    speeds.forEach(speed => {
      const speedButton = document.createElement('button');
      speedButton.id = `leetmentor-speed-${speed}`;
      speedButton.textContent = `${speed}x`;
      speedButton.dataset.speed = speed.toString();
      speedButton.style.cssText = `
        background: ${speed === 1.0 ? '#3b82f6' : '#ffffff'};
        color: ${speed === 1.0 ? 'white' : '#64748b'};
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        padding: 4px 6px;
        cursor: pointer;
        font-size: 10px;
        font-weight: 500;
        transition: all 0.2s;
        min-width: 24px;
      `;
      speedButton.title = `Speech speed ${speed}x ${speed === 1.0 ? '(Normal)' : speed < 1.0 ? '(Slower)' : '(Faster)'}`;

      speedButton.addEventListener('click', () => {
        this.setVoiceSpeed(speed);
      });

      speedButtons.push(speedButton);
      speedButtonsContainer.appendChild(speedButton);
    });

    speedContainer.appendChild(speedLabel);
    speedContainer.appendChild(speedButtonsContainer);

    // Voice mode toggle
    const modeToggle = document.createElement('button');
    modeToggle.id = 'leetmentor-mode-toggle';
    modeToggle.style.cssText = `
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 10px;
      font-weight: 500;
      transition: all 0.2s;
    `;
    modeToggle.textContent = 'Traditional';
    modeToggle.title = 'Switch to Realtime API';

    // Event listeners
    micButton.addEventListener('click', () => {
      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    });

    stopButton.addEventListener('click', () => {
      this.stopSpeaking();
    });

    modeToggle.addEventListener('click', () => {
      this.toggleVoiceMode();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target === document.body && this.isVoiceEnabled) {
        e.preventDefault();
        if (!this.isListening && !this.isSpeaking) {
          this.startListening();
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.isListening) {
        e.preventDefault();
        this.stopListening();
      }
    });

    buttonArea.appendChild(micButton);
    buttonArea.appendChild(stopButton);
    buttonArea.appendChild(speedContainer);
    buttonArea.appendChild(modeToggle);

    voiceContainer.appendChild(statusArea);
    voiceContainer.appendChild(buttonArea);

    return voiceContainer;
  }

  private setVoiceSpeed(rate: number) {
    // Clamp rate between reasonable bounds
    const clampedRate = Math.min(Math.max(rate, 0.25), 4.0);

    console.log(`🎤 LeetMentor: Setting voice speed to ${clampedRate}x`);

    // Update voice service if using traditional mode
    if (this.voiceService) {
      this.voiceService.setSpeechRate(clampedRate);
    }

    // Update speed button states
    this.updateSpeedButtons(clampedRate);
  }

  private updateSpeedButtons(currentSpeed: number = 1.0) {
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    speeds.forEach(speed => {
      const button = document.getElementById(`leetmentor-speed-${speed}`) as HTMLButtonElement;
      if (button) {
        if (Math.abs(speed - currentSpeed) < 0.01) {
          button.style.background = '#3b82f6';
          button.style.color = 'white';
        } else {
          button.style.background = '#ffffff';
          button.style.color = '#64748b';
        }
      }
    });
  }

  private updateVoiceUI() {
    const statusDot = document.getElementById('leetmentor-voice-status-dot');
    const statusText = document.getElementById('leetmentor-voice-status-text');
    const micButton = document.getElementById('leetmentor-mic-button');
    const stopButton = document.getElementById('leetmentor-stop-button');

    if (!statusDot || !statusText || !micButton || !stopButton) return;

    if (this.isListening) {
      statusDot.style.background = '#ef4444';
      statusDot.style.animation = 'pulse 1s infinite';
      statusText.textContent = 'Listening...';
      micButton.style.background = '#ef4444';
      micButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
      stopButton.style.display = 'none';
    } else if (this.isSpeaking) {
      statusDot.style.background = '#3b82f6';
      statusDot.style.animation = 'pulse 1s infinite';
      statusText.textContent = 'AI Speaking...';
      micButton.style.background = '#94a3b8';
      micButton.style.cursor = 'not-allowed';
      stopButton.style.display = 'flex';
    } else {
      statusDot.style.background = this.isVoiceEnabled ? '#22c55e' : '#94a3b8';
      statusDot.style.animation = 'none';
      statusText.textContent = this.isVoiceEnabled ? 'Voice Ready' : 'Voice Disabled';
      micButton.style.background = this.isVoiceEnabled ? '#3b82f6' : '#94a3b8';
      micButton.style.cursor = this.isVoiceEnabled ? 'pointer' : 'not-allowed';
      micButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"/>
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
          <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
        </svg>
      `;
      stopButton.style.display = 'none';
    }

    // Update mode toggle
    const modeToggle = document.getElementById('leetmentor-mode-toggle');
    if (modeToggle) {
      if (this.useRealtimeAPI) {
        modeToggle.style.background = '#8b5cf6';
        modeToggle.style.color = 'white';
        modeToggle.textContent = 'Realtime';
        modeToggle.title = 'Switch to Traditional';
      } else {
        modeToggle.style.background = '#f1f5f9';
        modeToggle.style.color = '#64748b';
        modeToggle.textContent = 'Traditional';
        modeToggle.title = 'Switch to Realtime API';
      }
    }
  }

  private updateTranscriptDisplay() {
    const transcriptPreview = document.getElementById('leetmentor-transcript-preview');
    if (!transcriptPreview) return;

    if (this.currentTranscript) {
      transcriptPreview.textContent = `"${this.currentTranscript}"`;
      transcriptPreview.style.opacity = '1';
    } else {
      transcriptPreview.style.opacity = '0';
    }
  }

  private async startListening() {
    if (!this.isVoiceEnabled || !this.embeddedConfig || !this.voiceService || !this.realtimeService) {
      console.log('LeetMentor: Voice not enabled, no config available, or voice services not initialized');
      return;
    }

    try {
      if (this.useRealtimeAPI) {
        if (!this.realtimeService.getIsConnected()) {
          await this.realtimeService.connect();
        }
        await this.realtimeService.startListening(this.embeddedConfig.speechRecognition);
      } else {
        await this.voiceService.startListening(this.embeddedConfig.speechRecognition);
      }
    } catch (error) {
      console.error('LeetMentor: Failed to start listening:', error);
    }
  }

  private stopListening() {
    if (!this.voiceService || !this.realtimeService) return;
    
    if (this.useRealtimeAPI) {
      this.realtimeService.stopListening();
    } else {
      this.voiceService.stopListening();
    }
  }

  private stopSpeaking() {
    if (!this.voiceService || !this.realtimeService) return;
    
    if (this.useRealtimeAPI) {
      this.realtimeService.stopSpeaking();
    } else {
      this.voiceService.stopSpeaking();
    }
  }

  private toggleVoiceMode() {
    this.useRealtimeAPI = !this.useRealtimeAPI;
    this.stopListening();
    this.stopSpeaking();
    this.updateVoiceUI();
    console.log('LeetMentor: Switched to', this.useRealtimeAPI ? 'Realtime API' : 'Traditional Voice');
  }

  private async speakText(text: string) {
    if (!this.isVoiceEnabled || !this.embeddedConfig?.voice) {
      return;
    }

    try {
      if (this.useRealtimeAPI) {
        // For realtime API, text-to-speech is handled automatically
        this.realtimeService.sendTextMessage(text);
      } else {
        // Use traditional voice service
        await this.voiceService.speak(text, this.embeddedConfig.voice);
      }
    } catch (error) {
      console.error('LeetMentor: Error speaking text:', error);
    }
  }

  private autoResizeTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
  }

  private async initializeEmbeddedInterview() {
    if (!this.problem) {
      console.log('LeetMentor: No problem detected, waiting for problem to load...');
      return;
    }

    console.log('LeetMentor: Initializing embedded interview for problem:', this.problem.title);
    
    // Get configuration from storage
    try {
      const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
      if (configResponse.success && configResponse.data) {
        this.embeddedConfig = configResponse.data;
        console.log('LeetMentor: Configuration loaded for embedded interview');
        
        // Configure voice services
        if (this.embeddedConfig.apiKey) {
          this.voiceService.setApiKey(this.embeddedConfig.apiKey);
          this.voiceService.setUseOpenAIVoice(true);
          this.voiceService.setUseOpenAIWhisper(true);
          
          this.realtimeService.setApiKey(this.embeddedConfig.apiKey);
          
          this.isVoiceEnabled = this.embeddedConfig.voice?.enabled && this.embeddedConfig.speechRecognition?.enabled;
          
          console.log('LeetMentor: Voice services configured. Voice enabled:', this.isVoiceEnabled);
          this.updateVoiceUI();
          
          // Speak welcome message if voice is enabled
          if (this.isVoiceEnabled && this.embeddedConfig.voice) {
            const welcomeText = "Hello! I'm your AI interviewer. Let's start by having you explain this problem in your own words.";
            await this.speakText(welcomeText);
          }
        } else {
          console.warn('LeetMentor: No API key configured, voice features will be limited');
        }
      } else {
        console.warn('LeetMentor: Could not load configuration, some features may not work');
      }
    } catch (error) {
      console.warn('LeetMentor: Error loading configuration:', error);
    }
  }

  private async handleUserMessage(content: string) {
    if (!content.trim()) return;

    console.log('LeetMentor: Handling user message:', content);

    // Show loading indicator
    this.addSimpleMessage('AI is thinking...', 'ai');

    try {
      // Use background service to handle the message
      const response = await chrome.runtime.sendMessage({
        type: 'HANDLE_EMBEDDED_MESSAGE',
        data: {
          problem: this.problem,
          message: content,
          config: this.embeddedConfig
        }
      });

      if (response.success && response.data) {
        // Replace the loading message with the actual response
        const messagesContainer = document.getElementById('leetmentor-messages-simple');
        if (messagesContainer && messagesContainer.lastElementChild) {
          messagesContainer.removeChild(messagesContainer.lastElementChild);
        }
        
        // Add AI response to chat
        this.addSimpleMessage(response.data.response, 'ai');
        
        // Speak AI response if voice is enabled
        if (this.isVoiceEnabled && this.embeddedConfig?.voice) {
          await this.speakText(response.data.response);
        }
      } else {
        const errorMsg = 'Sorry, I encountered an error processing your message. Please try again.';
        
        // Replace loading with error message
        const messagesContainer = document.getElementById('leetmentor-messages-simple');
        if (messagesContainer && messagesContainer.lastElementChild) {
          messagesContainer.removeChild(messagesContainer.lastElementChild);
        }
        this.addSimpleMessage(errorMsg, 'ai');
        
        // Speak error message if voice is enabled
        if (this.isVoiceEnabled && this.embeddedConfig?.voice) {
          await this.speakText(errorMsg);
        }
      }
    } catch (error) {
      console.error('LeetMentor: Error handling user message:', error);
      
      // Replace loading with error message
      const messagesContainer = document.getElementById('leetmentor-messages-simple');
      if (messagesContainer && messagesContainer.lastElementChild) {
        messagesContainer.removeChild(messagesContainer.lastElementChild);
      }
      this.addSimpleMessage('Sorry, I encountered an error. Please make sure your API key is configured in the extension popup.', 'ai');
    }
  }

  private addMessageToChat(messagesArea: HTMLElement, content: string, role: 'user' | 'ai') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      background: ${role === 'user' ? '#3b82f6' : '#f1f5f9'};
      color: ${role === 'user' ? 'white' : '#1f2937'};
      padding: 12px;
      margin-bottom: 8px;
      border-radius: ${role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px'};
      max-width: 85%;
      margin-left: ${role === 'user' ? 'auto' : '0'};
      margin-right: ${role === 'user' ? '0' : 'auto'};
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
      ${role === 'ai' ? 'border-left: 4px solid #3b82f6;' : ''}
    `;
    
    // Handle code blocks and formatting
    const formattedContent = content
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background: #f3f4f6; padding: 8px; border-radius: 4px; margin: 8px 0; overflow-x: auto; font-family: monospace;"><code>$2</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = formattedContent;
    messagesArea.appendChild(messageDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
  }

  private addLoadingToChat(messagesArea: HTMLElement): string {
    const loadingId = 'loading-' + Date.now();
    const loadingDiv = document.createElement('div');
    loadingDiv.id = loadingId;
    loadingDiv.style.cssText = `
      background: #f1f5f9;
      color: #1f2937;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 12px 12px 12px 4px;
      max-width: 85%;
      margin-left: 0;
      margin-right: auto;
      font-size: 14px;
      line-height: 1.4;
      border-left: 4px solid #3b82f6;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    loadingDiv.innerHTML = `
      <div style="
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      "></div>
      AI is thinking...
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    
    messagesArea.appendChild(loadingDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    return loadingId;
  }

  private removeLoadingFromChat(messagesArea: HTMLElement, loadingId: string) {
    const loadingDiv = document.getElementById(loadingId);
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  private startSubmissionMonitoring() {
    console.log('LeetMentor: Starting submission monitoring...');
    
    // Monitor for changes in the DOM that indicate submissions
    const submissionObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Look for submission result indicators
              if (this.isSubmissionResult(element)) {
                this.handleSubmissionResult(element);
              }
              
              // Also check child elements
              const submissionResults = element.querySelectorAll(this.getSubmissionResultSelectors().join(','));
              submissionResults.forEach((result) => {
                this.handleSubmissionResult(result);
              });
            }
          });
        }
      });
    });

    // Monitor the entire document for submission results
    submissionObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also set up periodic checking for submission results
    setInterval(() => {
      this.checkForSubmissionResults();
    }, 2000);
  }

  private isSubmissionResult(element: Element): boolean {
    const text = element.textContent?.toLowerCase() || '';
    const className = element.className?.toLowerCase() || '';
    
    // Check for submission result indicators
    return text.includes('accepted') || 
           text.includes('wrong answer') || 
           text.includes('time limit exceeded') || 
           text.includes('runtime error') ||
           text.includes('compile error') ||
           className.includes('result') ||
           className.includes('submission');
  }

  private getSubmissionResultSelectors(): string[] {
    return [
      '[data-e2e-locator*="submission"]',
      '[class*="submission"]',
      '[class*="result"]',
      '[class*="status"]',
      '.text-green-500', // Accepted
      '.text-red-500',   // Wrong Answer
      '.text-orange-500', // TLE
      '[data-cy*="result"]',
      '[data-testid*="result"]'
    ];
  }

  private async checkForSubmissionResults() {
    const selectors = this.getSubmissionResultSelectors();
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (this.isSubmissionResult(element) && !element.hasAttribute('data-leetmentor-processed')) {
          element.setAttribute('data-leetmentor-processed', 'true');
          this.handleSubmissionResult(element);
        }
      });
    }
  }

  private async handleSubmissionResult(element: Element) {
    const text = element.textContent?.toLowerCase() || '';
    const isAccepted = text.includes('accepted');
    const isWrongAnswer = text.includes('wrong answer');
    const isTimeLimitExceeded = text.includes('time limit exceeded');
    const isRuntimeError = text.includes('runtime error');
    
    if (!isAccepted && !isWrongAnswer && !isTimeLimitExceeded && !isRuntimeError) {
      return; // Not a definitive result
    }

    console.log('LeetMentor: Detected submission result:', text);

    // Update submission status
    const statusElement = document.getElementById('leetmentor-submission-status');
    if (statusElement) {
      const resultType = isAccepted ? 'Accepted ✅' : 
                        isWrongAnswer ? 'Wrong Answer ❌' :
                        isTimeLimitExceeded ? 'Time Limit Exceeded ⏰' :
                        isRuntimeError ? 'Runtime Error 💥' : 'Result Detected';
      
      statusElement.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Submission Result: ${resultType}
      `;
      statusElement.style.color = isAccepted ? '#16a34a' : '#dc2626';
    }

    // Send result to AI for feedback
    const messagesArea = document.getElementById('leetmentor-messages');
    if (messagesArea) {
      const resultMessage = isAccepted ? 
        "Great! Your solution was accepted. The tests passed successfully." :
        `Your submission result: ${text}. Let's analyze what might need to be improved.`;
      
      this.addMessageToChat(messagesArea, resultMessage, 'ai');
      
      // Get AI feedback on the result
      if (!isAccepted) {
        const loadingId = this.addLoadingToChat(messagesArea);
        
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'HANDLE_SUBMISSION_RESULT',
            data: {
              problem: this.problem,
              result: text,
              isAccepted: isAccepted,
              config: this.embeddedConfig
            }
          });

          this.removeLoadingFromChat(messagesArea, loadingId);
          
          if (response.success && response.data) {
            this.addMessageToChat(messagesArea, response.data.feedback, 'ai');
            
            // Speak the feedback if voice is enabled
            if (this.isVoiceEnabled && this.embeddedConfig?.voice) {
              await this.speakText(response.data.feedback);
            }
          }
        } catch (error) {
          console.error('LeetMentor: Error getting AI feedback on submission:', error);
          this.removeLoadingFromChat(messagesArea, loadingId);
        }
      }
    }
  }

  private updateInterviewButton() {
    const button = document.getElementById('leetmentor-interview-button');
    if (button && this.problem) {
      button.title = `Start interview practice for: ${this.problem.title}`;
    }
  }

  private async startInterview() {
    if (!this.problem) {
      alert('Please wait for the problem to load completely.');
      return;
    }

    // Validate that cached problem matches current URL
    const currentUrl = window.location.href;
    if (this.problem.url !== currentUrl) {
      console.warn('LeetMentor: Problem URL mismatch. Re-detecting problem...');
      await this.detectCurrentProblem();
      
      if (!this.problem || this.problem.url !== currentUrl) {
        alert('Problem data seems outdated. Please refresh the page and try again.');
        return;
      }
    }

    try {
      console.log('LeetMentor: Starting interview with problem:', this.problem);
      
      // Store problem data in chrome storage for the interview tab to access
      await chrome.storage.local.set({
        'leetmentor_current_problem': this.problem,
        'leetmentor_problem_timestamp': Date.now()
      });

      // Send message to background script to start interview
      const response = await chrome.runtime.sendMessage({
        type: 'START_INTERVIEW',
        data: { problem: this.problem }
      });

      if (response.success) {
        console.log('LeetMentor: Interview session created:', response.data);
        // Open interview interface
        this.openInterviewInterface(response.data);
      } else {
        console.error('Failed to start interview:', response.error);
        alert('Failed to start interview. Please try again.');
      }
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Error starting interview. Please try again.');
    }
  }

  private openInterviewInterface(session: any) {
    // Create iframe or new window for interview interface
    const interviewUrl = chrome.runtime.getURL('interview.html');
    
    // For now, open in a new tab
    window.open(`${interviewUrl}?sessionId=${session.id}`, '_blank');
  }
}

// Initialize the detector when DOM is ready
let detectorInstance: LeetCodeDetector | null = null;

// Debug helper function (can be called from browser console)
(window as any).leetmentorDebug = {
  async checkCache() {
    const data = await chrome.storage.local.get(['leetmentor_current_problem', 'leetmentor_problem_timestamp']);
    console.log('🔍 LeetMentor Cache Debug:');
    console.log('  - Current URL:', window.location.href);
    console.log('  - Cached problem:', data.leetmentor_current_problem?.title || 'None');
    console.log('  - Cached URL:', data.leetmentor_current_problem?.url || 'None');
    console.log('  - Cache timestamp:', data.leetmentor_problem_timestamp ? new Date(data.leetmentor_problem_timestamp) : 'None');
    console.log('  - Cache age:', data.leetmentor_problem_timestamp ? Math.round((Date.now() - data.leetmentor_problem_timestamp) / 1000) + ' seconds' : 'Unknown');
    return data;
  },
  
  async clearCache() {
    await chrome.storage.local.remove(['leetmentor_current_problem', 'leetmentor_problem_timestamp']);
    console.log('🗑️ LeetMentor cache cleared');
  },
  
  async forceRefresh() {
    if (detectorInstance) {
      await detectorInstance.clearOldCache();
      await detectorInstance.detectCurrentProblem();
      console.log('🔄 LeetMentor forced refresh complete');
    }
  },
  
  forceInject() {
    if (detectorInstance) {
      (detectorInstance as any).injectSimpleTestButton();
      console.log('🔧 LeetMentor force inject test button');
    }
  }
};

function initializeLeetMentor() {
  console.log('🔥 DEBUG: initializeLeetMentor function called!');
  console.log('🚀 LeetMentor: Initializing detector...');
  console.log('🔍 Document ready state:', document.readyState);
  console.log('🔍 Current URL:', window.location.href);
  
  try {
    if (detectorInstance) {
      console.log('🔄 LeetMentor: Cleaning up existing instance...');
      detectorInstance.cleanup();
    }
    console.log('🔥 DEBUG: About to create new LeetCodeDetector...');
    detectorInstance = new LeetCodeDetector();
    console.log('🔥 DEBUG: LeetCodeDetector created successfully!');
  } catch (error) {
    console.error('❌ LeetMentor: Failed to initialize:', error);
  }
}

console.log('🔥 DEBUG: Script reached initialization section');

// Multiple initialization strategies to ensure it works
if (document.readyState === 'loading') {
  console.log('📄 LeetMentor: Document still loading, waiting for DOMContentLoaded...');
  document.addEventListener('DOMContentLoaded', initializeLeetMentor);
} else {
  console.log('📄 LeetMentor: Document already loaded, initializing immediately...');
  // Give a small delay to ensure everything is properly loaded
  setTimeout(initializeLeetMentor, 100);
}

// Also try after a longer delay as a backup
setTimeout(() => {
  if (!detectorInstance) {
    console.log('🔄 LeetMentor: Backup initialization (no instance found)...');
    initializeLeetMentor();
  }
}, 3000);

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  if (detectorInstance) {
    detectorInstance.cleanup();
  }
});

// Cleanup when extension context is invalidated
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onConnect.addListener(() => {
    // Extension context is still valid
  });
  
  // Handle extension context invalidation
  const originalSendMessage = chrome.runtime.sendMessage;
  chrome.runtime.sendMessage = function(...args) {
    try {
      return originalSendMessage.apply(chrome.runtime, args);
    } catch (error) {
      console.log('LeetMentor: Extension context invalidated, cleaning up...');
      if (detectorInstance) {
        detectorInstance.cleanup();
        detectorInstance = null;
      }
      throw error;
    }
  };
}

