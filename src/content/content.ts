import { LeetCodeProblem, TestCase, CodeSnippet } from '../types/leetcode';

// Content script for LeetCode problem detection
class LeetCodeDetector {
  private problem: LeetCodeProblem | null = null;
  private observer: MutationObserver | null = null;
  private currentUrl: string = '';
  private urlCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('LeetMentor: Content script initializing on', window.location.href);
    this.currentUrl = window.location.href;
    this.setupMessageListener();
    this.setupDOMObserver();
    this.setupURLWatcher();
    this.clearOldCache();
    this.injectInterviewButton();
    this.detectCurrentProblem();
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
      this.injectInterviewButton();
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
          this.updateInterviewButton();
          
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

  private injectInterviewButton() {
    // Remove existing button if present
    const existingButton = document.getElementById('leetmentor-interview-button');
    if (existingButton) {
      existingButton.remove();
    }

    // Find a good place to inject the button
    const targetElement = document.querySelector('[data-cy="question-title"]') ||
                         document.querySelector('.css-v3d350') ||
                         document.querySelector('[class*="question-title"]') ||
                         document.querySelector('h1') ||
                         document.querySelector('[class*="title"]') ||
                         document.querySelector('.text-title-large') ||
                         document.querySelector('[data-e2e-locator="console-question-title"]') ||
                         document.querySelector('div[class*="title"]');

    console.log('LeetMentor: Trying to inject button, found target element:', targetElement);
    if (!targetElement) {
      console.log('LeetMentor: Could not find target element for button injection');
      return;
    }

    const button = document.createElement('button');
    button.id = 'leetmentor-interview-button';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
      </svg>
      Start Interview Practice
    `;
    
    button.className = `
      leetmentor-interview-btn
      inline-flex items-center gap-2 px-4 py-2 ml-4
      bg-gradient-to-r from-blue-500 to-purple-600
      hover:from-blue-600 hover:to-purple-700
      text-white font-medium rounded-lg
      transition-all duration-200
      shadow-lg hover:shadow-xl
      transform hover:scale-105
      cursor-pointer
    `;

    button.style.cssText = `
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-left: 16px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
    });

    button.addEventListener('click', () => {
      this.startInterview();
    });

    // Insert the button next to the title
    const parent = targetElement.parentElement;
    if (parent) {
      parent.style.display = 'flex';
      parent.style.alignItems = 'center';
      parent.appendChild(button);
      console.log('LeetMentor: Successfully injected button next to title');
    } else {
      // Fallback: try to insert after the target element
      targetElement.insertAdjacentElement('afterend', button);
      console.log('LeetMentor: Injected button after title element');
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
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    detectorInstance = new LeetCodeDetector();
  });
} else {
  detectorInstance = new LeetCodeDetector();
}

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
