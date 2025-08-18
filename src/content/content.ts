import { LeetCodeProblem, TestCase, CodeSnippet } from '../types/leetcode';

// Content script for LeetCode problem detection
class LeetCodeDetector {
  private problem: LeetCodeProblem | null = null;
  private observer: MutationObserver | null = null;

  constructor() {
    console.log('LeetMentor: Content script initializing on', window.location.href);
    this.setupMessageListener();
    this.setupDOMObserver();
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

  private handleNavigation() {
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

  private async detectCurrentProblem() {
    try {
      const problem = await this.extractProblemData();
      if (problem && problem.id !== this.problem?.id) {
        this.problem = problem;
        console.log('Detected LeetCode problem:', problem.title);
        this.updateInterviewButton();
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

    // Extract problem description
    const descriptionElement = document.querySelector('[class*="question-content"]') ||
                              document.querySelector('.content__u3I1 .question-content__JfgR') ||
                              document.querySelector('[data-key="description-content"]');
    
    const description = descriptionElement?.textContent?.trim() || '';

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
    
    // Look for example sections
    const exampleElements = document.querySelectorAll('[class*="example"], .example');
    
    exampleElements.forEach((element, index) => {
      const text = element.textContent || '';
      const inputMatch = text.match(/Input:\s*(.+?)(?=Output:|$)/s);
      const outputMatch = text.match(/Output:\s*(.+?)(?=Explanation:|$)/s);
      const explanationMatch = text.match(/Explanation:\s*(.+?)$/s);

      if (inputMatch && outputMatch) {
        testCases.push({
          input: inputMatch[1].trim(),
          output: outputMatch[1].trim(),
          explanation: explanationMatch ? explanationMatch[1].trim() : undefined
        });
      }
    });

    return testCases;
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

    try {
      console.log('LeetMentor: Starting interview with problem:', this.problem);
      
      // Store problem data in chrome storage for the interview tab to access
      await chrome.storage.local.set({
        'leetmentor_current_problem': this.problem
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new LeetCodeDetector());
} else {
  new LeetCodeDetector();
}
