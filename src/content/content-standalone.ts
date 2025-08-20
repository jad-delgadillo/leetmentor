console.log('🚀 STANDALONE: Content script loading...');
console.log('🚀 STANDALONE: URL:', window.location.href);

/**
 * Standalone AI Interviewer Content Script
 * 
 * This version is completely self-contained to avoid CSP issues
 * No external imports, no webpack chunks, pure vanilla JavaScript
 */
class StandaloneAIInterviewer {
  private isInjected = false;
  private currentPhase = 'problem-understanding';
  private conversationHistory: { role: 'user' | 'assistant'; content: string; timestamp: Date }[] = [];
  private isInterviewActive = false;
  private lastSubmissionCheck: number | null = null;
  private currentProblemSlug: string | null = null;
  private hasAcceptedSubmission: boolean = false;
  private isRecording: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private voiceEnabled: boolean = true;
  private voiceSpeed: number = 1.0; // 0.5 to 2.0
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    console.log('🚀 STANDALONE: StandaloneAIInterviewer constructor called');
    this.init();
  }

  private async init() {
    console.log('🚀 STANDALONE: Initializing...');
    
    // Wait for page to load
    if (document.readyState !== 'complete') {
      console.log('🚀 STANDALONE: Document not ready, waiting for load event');
      window.addEventListener('load', () => {
        console.log('🚀 STANDALONE: Load event fired');
        this.start();
      });
    } else {
      console.log('🚀 STANDALONE: Document ready, starting immediately');
      this.start();
    }

    // Handle navigation changes (LeetCode is SPA)
    this.setupNavigationWatcher();
    
    // Monitor for submission results
    this.setupSubmissionMonitor();
  }

  private start() {
    console.log('🚀 STANDALONE: Start method called');
    // Check if we're on a LeetCode problem page
    if (this.isLeetCodeProblemPage()) {
      console.log('✅ STANDALONE: Detected LeetCode problem page');
      setTimeout(() => {
        console.log('🚀 STANDALONE: Timeout fired, detecting problem...');
        this.detectProblem();
      }, 1000);
    } else {
      console.log('❌ STANDALONE: Not a LeetCode problem page');
    }
  }

  private isLeetCodeProblemPage(): boolean {
    // Check if we're on a LeetCode problem page (but not submissions)
    const isLeetCode = window.location.href.includes('leetcode.com/problems/') && 
                      !window.location.href.includes('/submissions/');
    console.log('🚀 STANDALONE: isLeetCodeProblemPage check:', isLeetCode);
    return isLeetCode;
  }

  private isSameProblem(newUrl: string): boolean {
    // Extract problem slug from URLs to check if it's the same problem
    // This regex captures the problem name and ignores suffixes like /description/, /submissions/, etc.
    const currentMatch = window.location.href.match(/leetcode\.com\/problems\/([^/?]+)/);
    const newMatch = newUrl.match(/leetcode\.com\/problems\/([^/?]+)/);
    
    if (!currentMatch || !newMatch) return false;
    
    const currentSlug = currentMatch[1];
    const newSlug = newMatch[1];
    
    console.log('🚀 STANDALONE: Problem comparison - Current:', currentSlug, 'New:', newSlug);
    console.log('🚀 STANDALONE: URLs - Current:', window.location.href, 'New:', newUrl);
    
    return currentSlug === newSlug;
  }

  private setupNavigationWatcher() {
    console.log('🚀 STANDALONE: Setting up navigation watcher');
    
    let currentUrl = window.location.href;
    this.currentProblemSlug = this.extractProblemSlug(currentUrl);
    
    console.log('🚀 STANDALONE: Initial URL:', currentUrl);
    console.log('🚀 STANDALONE: Initial problem slug:', this.currentProblemSlug);
    
    const checkForNavigation = () => {
      if (window.location.href !== currentUrl) {
        const newUrl = window.location.href;
        const newProblemSlug = this.extractProblemSlug(newUrl);
        
        console.log('🔄 STANDALONE: Navigation detected!');
        console.log('🔄 STANDALONE: Old URL:', currentUrl);
        console.log('🔄 STANDALONE: New URL:', newUrl);
        console.log('🔄 STANDALONE: Old slug:', this.currentProblemSlug);
        console.log('🔄 STANDALONE: New slug:', newProblemSlug);
        console.log('🔄 STANDALONE: Slugs equal?:', this.currentProblemSlug === newProblemSlug);
        console.log('🔄 STANDALONE: Interface injected?:', this.isInjected);
        
        // Only reset if it's actually a different problem
        if (this.currentProblemSlug !== newProblemSlug && 
            newProblemSlug !== null && 
            this.currentProblemSlug !== null &&
            this.isInjected) {
          console.log('🔄 STANDALONE: Different problem detected, resetting...');
          this.reset();
          this.currentProblemSlug = newProblemSlug;
          if (this.isLeetCodeProblemPage()) {
            setTimeout(() => {
              this.detectProblem();
            }, 1500);
          }
        } else if (this.currentProblemSlug === newProblemSlug && newProblemSlug !== null) {
          console.log('🔄 STANDALONE: Same problem, different section - NO RESET');
        } else if (newProblemSlug === null) {
          console.log('🔄 STANDALONE: Not a LeetCode problem page - NO RESET');
        } else if (!this.isInjected && newProblemSlug !== null && this.isLeetCodeProblemPage()) {
          console.log('🔄 STANDALONE: No interface yet, detecting problem...');
          this.currentProblemSlug = newProblemSlug;
          setTimeout(() => {
            this.detectProblem();
          }, 1000);
        } else {
          console.log('🔄 STANDALONE: Other navigation scenario - NO RESET');
        }
        
        // Always update the current URL
        currentUrl = newUrl;
        
        // Update the problem slug if we're on a valid problem page
        if (newProblemSlug !== null) {
          this.currentProblemSlug = newProblemSlug;
        }
      }
    };

    setInterval(checkForNavigation, 1000); // Reduced frequency to 1 second
    
    window.addEventListener('popstate', () => {
      console.log('🔄 STANDALONE: Popstate event');
      setTimeout(checkForNavigation, 100);
    });
  }

  private extractProblemSlug(url: string): string | null {
    const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
    return match ? match[1] : null;
  }

  private reset() {
    console.log('🚀 STANDALONE: Resetting state');
    this.isInjected = false;
    this.isInterviewActive = false;
    this.currentPhase = 'problem-understanding';
    this.conversationHistory = [];
    this.hasAcceptedSubmission = false;
    
    // Stop any ongoing recording
    this.stopRecording();
    
    const existingInterface = document.getElementById('leetmentor-standalone');
    if (existingInterface) {
      existingInterface.remove();
    }
  }

  private async detectProblem() {
    try {
      console.log('🔍 STANDALONE: Detecting problem...');
      
      // Wait longer and try multiple selectors
      const titleElement = await this.waitForAnyElement([
        '[data-cy="question-title"]',
        '.css-v3d350',
        'h1',
        '[class*="title"]',
        '[class*="Title"]',
        '.text-title-large',
        '.text-xl',
        'h1[class*="title"]',
        '[data-testid="question-title"]'
      ]);
      
      if (titleElement) {
        console.log('✅ STANDALONE: Title element found:', titleElement.textContent);
        const problem = await this.extractProblemData(titleElement);
        if (problem) {
          console.log('✅ STANDALONE: Problem detected:', problem.title);
          this.injectInterviewInterface(problem);
        } else {
          console.log('❌ STANDALONE: Could not extract problem data');
          // Still try to inject interface without problem data
          this.injectInterviewInterface();
        }
      } else {
        console.log('❌ STANDALONE: No title element found after trying all selectors');
        // Try to inject interface anyway
        this.injectInterviewInterface();
      }
    } catch (error) {
      console.error('❌ STANDALONE: Error detecting problem:', error);
    }
  }

  private waitForAnyElement(selectors: string[], timeout = 15000): Promise<Element | null> {
    console.log('🚀 STANDALONE: Waiting for any element from:', selectors);
    return new Promise((resolve) => {
      // Check immediately
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          console.log('✅ STANDALONE: Element found immediately with selector:', selector);
          resolve(element);
          return;
        }
      }

      // Set up observer
      const observer = new MutationObserver(() => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            console.log('✅ STANDALONE: Element found via observer with selector:', selector);
            observer.disconnect();
            resolve(element);
            return;
          }
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });

      // Timeout
      setTimeout(() => {
        console.log('⏰ STANDALONE: Element wait timeout after trying:', selectors);
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  private async extractProblemData(titleElement?: Element): Promise<any> {
    console.log('🚀 STANDALONE: Extracting problem data...');
    
    const url = window.location.href;
    const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
    
    if (!match) {
      console.log('❌ STANDALONE: URL does not match LeetCode pattern');
      return null;
    }

    const titleSlug = match[1];
    console.log('🚀 STANDALONE: Title slug:', titleSlug);
    
    // Use provided title element or find one
    let title = '';
    if (titleElement) {
      title = titleElement.textContent?.trim() || '';
      console.log('🚀 STANDALONE: Using provided title element:', title);
    } else {
      // Try to find title element
      const foundTitleElement = document.querySelector('[data-cy="question-title"]') || 
                               document.querySelector('.css-v3d350') ||
                               document.querySelector('h1') ||
                               document.querySelector('[class*="title"]');
      
      if (foundTitleElement) {
        title = foundTitleElement.textContent?.trim() || '';
        console.log('🚀 STANDALONE: Found title element:', title);
      } else {
        console.log('❌ STANDALONE: No title element found');
        return null;
      }
    }
    
    // Extract difficulty from the page
    const difficulty = this.detectDifficulty();
    console.log('🚀 STANDALONE: Detected difficulty:', difficulty);
    
    return {
      id: titleSlug,
      title,
      titleSlug,
      difficulty,
      description: 'Standalone version - minimal data',
      url
    };
  }

  private detectDifficulty(): string {
    // Try multiple selectors for difficulty detection
    const difficultySelectors = [
      '[data-e2e-locator="console-question-detail-difficulty"]',
      '[class*="difficulty"]',
      '[class*="Difficulty"]',
      '.text-difficulty-easy',
      '.text-difficulty-medium', 
      '.text-difficulty-hard',
      '.text-easy',
      '.text-medium',
      '.text-hard',
      '[data-cy*="difficulty"]',
      '.text-olive', // Easy
      '.text-yellow', // Medium  
      '.text-pink' // Hard
    ];
    
    for (const selector of difficultySelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent?.toLowerCase().trim() || '';
        console.log('🔍 STANDALONE: Found difficulty element:', selector, 'text:', text);
        
        if (text.includes('easy')) return 'Easy';
        if (text.includes('medium')) return 'Medium';
        if (text.includes('hard')) return 'Hard';
      }
    }
    
    // Try to find difficulty by class names
    const difficultyElements = document.querySelectorAll('*');
    for (const element of difficultyElements) {
      const className = element.className.toLowerCase();
      const text = element.textContent?.toLowerCase().trim() || '';
      
      // Check for difficulty in class names
      if ((className.includes('easy') || text === 'easy') && text.length < 10) {
        console.log('🔍 STANDALONE: Found Easy difficulty via class/text');
        return 'Easy';
      }
      if ((className.includes('medium') || text === 'medium') && text.length < 10) {
        console.log('🔍 STANDALONE: Found Medium difficulty via class/text');
        return 'Medium';
      }
      if ((className.includes('hard') || text === 'hard') && text.length < 10) {
        console.log('🔍 STANDALONE: Found Hard difficulty via class/text');
        return 'Hard';
      }
    }
    
    console.log('⚠️ STANDALONE: Could not detect difficulty, defaulting to Medium');
    return 'Medium';
  }

  private injectInterviewInterface(problem?: any) {
    console.log('💉 STANDALONE: Injecting interview interface...');
    
    // Remove existing
    const existing = document.getElementById('leetmentor-standalone');
    if (existing) {
      existing.remove();
    }

    // Find injection target
    const container = this.findInjectionTarget();
    if (!container) {
      console.log('❌ STANDALONE: Could not find injection target');
      return;
    }

    console.log('✅ STANDALONE: Found injection container:', container);

    // Test if styles are working
    this.testStyles();

    // Create interview interface with inline styles (CSP-compliant)
    const interviewInterface = document.createElement('div');
    interviewInterface.id = 'leetmentor-standalone';
    
    const problemTitle = problem?.title || 'Unknown Problem';
    const difficulty = problem?.difficulty || 'Medium';
    const difficultyColor = this.getDifficultyColor(difficulty);
    
    // Use inline styles instead of CSS classes for CSP compliance
    interviewInterface.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        margin: 20px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: white;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        position: relative;
        z-index: 10000;
        transform: translateY(0);
        opacity: 1;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        ">
          <div style="
            display: flex;
            align-items: center;
            gap: 12px;
          ">
            <div style="
              font-size: 24px;
              background: rgba(255, 255, 255, 0.2);
              width: 48px;
              height: 48px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              backdrop-filter: blur(10px);
            ">🎯</div>
            <div style="line-height: 1.2;">
              <div style="
                font-size: 20px;
                font-weight: 700;
                letter-spacing: -0.5px;
                color: white;
              ">LeetMentor</div>
              <div style="
                font-size: 12px;
                opacity: 0.8;
                font-weight: 500;
                color: white;
              ">AI Interview Assistant</div>
            </div>
          </div>
          <div style="
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 500;
            color: white;
          ">
            <div style="
              width: 8px;
              height: 8px;
              background: #22c55e;
              border-radius: 50%;
              animation: pulse 2s infinite;
            "></div>
            <span>Ready</span>
          </div>
        </div>
        
        <div style="
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        ">
          <div style="
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.4;
            color: white;
          ">${problemTitle}</div>
          <div style="
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: white;
            background: ${difficultyColor};
          ">${difficulty}</div>
        </div>
        
        <div style="
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        ">
          <button id="start-interview-btn" style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            min-width: 0;
            flex: 1;
            justify-content: center;
            font-family: inherit;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0, 0, 0, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <span style="font-size: 16px;">🎤</span>
            Start Interview
          </button>
          <button id="voice-test-btn" style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 20px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            min-width: 0;
            flex: 1;
            justify-content: center;
            font-family: inherit;
            background: linear-gradient(135deg, #3b82f6, #2563eb);
            color: white;
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0, 0, 0, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <span style="font-size: 16px;">🔊</span>
            Test Voice
          </button>
          <button id="settings-btn" style="
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            min-width: 0;
            flex: 0 0 auto;
            justify-content: center;
            font-family: inherit;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 20px rgba(0, 0, 0, 0.2)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <span style="font-size: 16px;">⚙️</span>
          </button>
        </div>
        
        <div id="chat-container" style="
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
          backdrop-filter: blur(10px);
          display: none;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <div style="
              font-size: 16px;
              font-weight: 600;
              color: white;
            ">Interview Session</div>
            <div style="display: flex; gap: 8px;">
              <button id="clear-chat-btn" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">Clear</button>
              <button id="export-chat-btn" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">Export</button>
            </div>
          </div>
          <div id="chat-messages" style="
            max-height: 400px;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          "></div>
          <div style="
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <div style="
              display: flex;
              gap: 12px;
              align-items: flex-end;
            ">
              <textarea id="user-input" style="
                flex: 1;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 12px 16px;
                color: white;
                font-size: 14px;
                font-family: inherit;
                resize: none;
                min-height: 44px;
                max-height: 120px;
                transition: all 0.2s ease;
              " placeholder="Type your response or use voice..." rows="1" onfocus="this.style.borderColor='rgba(59, 130, 246, 0.5)'; this.style.background='rgba(255, 255, 255, 0.15)'" onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'; this.style.background='rgba(255, 255, 255, 0.1)'"></textarea>
              <button id="voice-record-btn" style="
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                border: none;
                border-radius: 12px;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
              " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(139, 92, 246, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                <span style="
                  color: white;
                  font-size: 16px;
                ">🎤</span>
              </button>
              <button id="send-btn" style="
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border: none;
                border-radius: 12px;
                width: 44px;
                height: 44px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s ease;
                flex-shrink: 0;
              " onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 4px 12px rgba(34, 197, 94, 0.3)'" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'">
                <span style="
                  color: white;
                  font-size: 16px;
                  font-weight: bold;
                ">➤</span>
              </button>
            </div>
            <div style="
              margin-top: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 12px;
              opacity: 0.7;
              color: white;
            ">
              <div>Press Enter to send • Hold Spacebar for voice • Esc to unfocus input</div>
              <button id="skip-voice-btn" style="
                background: rgba(239, 68, 68, 0.2);
                border: 1px solid rgba(239, 68, 68, 0.4);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: none;
              " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">⏭️ Skip Voice</button>
              <div style="display: flex; gap: 4px; align-items: center;">
                <button id="voice-speed-slow" style="
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 9px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">0.5x</button>
                <button id="voice-speed-normal" style="
                  background: rgba(59, 130, 246, 0.3);
                  border: 1px solid rgba(59, 130, 246, 0.5);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 9px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(59, 130, 246, 0.4)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.3)'">1.0x</button>
                <button id="voice-speed-fast" style="
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  color: white;
                  padding: 2px 6px;
                  border-radius: 3px;
                  font-size: 9px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">1.5x</button>
                <button id="voice-toggle-btn" style="
                  background: rgba(255, 255, 255, 0.1);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  color: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  font-size: 10px;
                  cursor: pointer;
                  transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">🔊 Voice ON</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.insertBefore(interviewInterface, container.firstChild);
    console.log('✅ STANDALONE: Interview interface injected successfully!');
    
    this.isInjected = true;
    
    // Add event listeners
    this.setupEventListeners();
  }

  // Removed CSS injection method - using inline styles for CSP compliance

  private getDifficultyColor(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#22c55e';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  }

  private findInjectionTarget(): Element | null {
    console.log('🔍 STANDALONE: Finding injection target...');
    
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

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ STANDALONE: Found element with selector: ${selector}`);
        return element;
      }
    }

    // Fallback to body if no specific target found
    console.log('⚠️ STANDALONE: No specific injection target found, using body');
    return document.body;
  }

  private setupEventListeners() {
    const startBtn = document.getElementById('start-interview-btn');
    const voiceBtn = document.getElementById('voice-test-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const clearChatBtn = document.getElementById('clear-chat-btn');
    const exportChatBtn = document.getElementById('export-chat-btn');
    
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        console.log('🚀 STANDALONE: Start interview clicked');
        this.startInterview();
      });
    }
    
    if (voiceBtn) {
      voiceBtn.addEventListener('click', () => {
        console.log('🎤 STANDALONE: Voice test clicked');
        this.testVoice();
      });
    }
    
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        console.log('⚙️ STANDALONE: Settings clicked');
        this.showSettings();
      });
    }
    
    if (clearChatBtn) {
      clearChatBtn.addEventListener('click', () => {
        console.log('🗑️ STANDALONE: Clear chat clicked');
        this.clearChat();
      });
    }
    
    if (exportChatBtn) {
      exportChatBtn.addEventListener('click', () => {
        console.log('📤 STANDALONE: Export chat clicked');
        this.exportChat();
      });
    }
  }

  private startInterview() {
    console.log('🚀 STANDALONE: Starting interview...');
    
    const chatContainer = document.getElementById('chat-container');
    const startBtn = document.getElementById('start-interview-btn');
    
    if (chatContainer && startBtn) {
      chatContainer.style.display = 'block';
      startBtn.textContent = 'Interview Active';
      startBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      this.isInterviewActive = true;
      
      // Add welcome message (don't read this one aloud)
      this.addMessageToChat('assistant', "Hi! I'm your technical interviewer today. We'll be doing a 45-minute coding interview focusing on problem-solving and algorithm design.\n\nCan you explain this problem in your own words? What are the key inputs and expected outputs?\n\n*Remember: You'll implement your solution in the LeetCode code editor, and we'll discuss your approach, complexity analysis, and optimizations together.*");
      
      // Setup chat input
      this.setupChatInput();
    }
  }

  private setupChatInput() {
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
    const voiceRecordBtn = document.getElementById('voice-record-btn');
    
    if (sendBtn && userInput) {
      // Auto-resize textarea
      userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
      });
      
      sendBtn.addEventListener('click', () => {
        this.sendMessage();
      });
      
      userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
      
      // Focus input
      userInput.focus();
    }
    
    // Add global keyboard shortcuts for voice recording
    document.addEventListener('keydown', (e) => {
      // Handle spacebar for voice recording (even when input is focused)
      if (e.key === ' ') {
        // If we're typing in an input field, don't prevent default (allow normal spacebar behavior)
        if (this.isTypingInInput()) {
          return;
        }
        
        // Otherwise, use spacebar for voice recording
        e.preventDefault();
        this.toggleVoiceRecording();
      }
      
      // Escape key to unfocus input field
      if (e.key === 'Escape') {
        const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
        if (userInput && document.activeElement === userInput) {
          userInput.blur();
        }
      }
    });
    
    document.addEventListener('keyup', (e) => {
      // Stop recording when spacebar is released
      if (e.key === ' ' && this.isRecording) {
        e.preventDefault();
        this.stopRecording();
      }
    });
    
    if (voiceRecordBtn) {
      voiceRecordBtn.addEventListener('click', () => {
        this.toggleVoiceRecording();
      });
    }
    
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    if (voiceToggleBtn) {
      voiceToggleBtn.addEventListener('click', () => {
        this.toggleVoiceEnabled();
      });
    }
    
    // Add speed control event listeners
    const speedSlowBtn = document.getElementById('voice-speed-slow');
    const speedNormalBtn = document.getElementById('voice-speed-normal');
    const speedFastBtn = document.getElementById('voice-speed-fast');
    
    if (speedSlowBtn) {
      speedSlowBtn.addEventListener('click', () => {
        this.setVoiceSpeed(0.5);
      });
    }
    
    if (speedNormalBtn) {
      speedNormalBtn.addEventListener('click', () => {
        this.setVoiceSpeed(1.0);
      });
    }
    
    if (speedFastBtn) {
      speedFastBtn.addEventListener('click', () => {
        this.setVoiceSpeed(1.5);
      });
    }
    
    const skipVoiceBtn = document.getElementById('skip-voice-btn');
    if (skipVoiceBtn) {
      skipVoiceBtn.addEventListener('click', () => {
        this.skipCurrentVoice();
      });
    }
  }

  private sendMessage() {
    const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
    const sendBtn = document.getElementById('send-btn') as HTMLButtonElement;
    
    if (userInput && sendBtn) {
      const message = userInput.value.trim();
      if (message) {
        // Disable input while processing
        userInput.disabled = true;
        sendBtn.disabled = true;
        
        this.handleUserMessage(message);
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Re-enable input
        setTimeout(() => {
          userInput.disabled = false;
          sendBtn.disabled = false;
          userInput.focus();
        }, 100);
      }
    }
  }

  private testVoice() {
    console.log('🎤 STANDALONE: Testing voice capabilities...');
    
    const voiceBtn = document.getElementById('voice-test-btn') as HTMLButtonElement;
    if (voiceBtn) {
      voiceBtn.textContent = 'Testing...';
      voiceBtn.disabled = true;
    }
    
    // Test if speech recognition is available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('✅ STANDALONE: Speech recognition available');
      this.showNotification('Speech recognition available! Voice features can be implemented.', 'success');
    } else {
      console.log('❌ STANDALONE: Speech recognition not available');
      this.showNotification('Speech recognition not available in this browser.', 'error');
    }
    
    // Test if speech synthesis is available
    if ('speechSynthesis' in window) {
      console.log('✅ STANDALONE: Speech synthesis available');
      const utterance = new SpeechSynthesisUtterance('Hello! This is a test of speech synthesis.');
      speechSynthesis.speak(utterance);
    } else {
      console.log('❌ STANDALONE: Speech synthesis not available');
    }
    
    // Reset button
    setTimeout(() => {
      if (voiceBtn) {
        voiceBtn.innerHTML = '<span class="lm-btn-icon">🔊</span>Test Voice';
        voiceBtn.disabled = false;
      }
    }, 2000);
  }

  private showSettings() {
    this.showNotification('Settings panel coming soon!', 'info');
  }

  private clearChat() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
      this.conversationHistory = [];
      this.showNotification('Chat cleared!', 'success');
    }
  }

  private exportChat() {
    if (this.conversationHistory.length === 0) {
      this.showNotification('No chat history to export!', 'warning');
      return;
    }
    
    const chatText = this.conversationHistory.map(msg => 
      `${msg.role === 'user' ? 'You' : 'AI Interviewer'}: ${msg.content}`
    ).join('\n\n');
    
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leetmentor-interview-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.showNotification('Chat exported successfully!', 'success');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private async handleUserMessage(message: string) {
    console.log('💬 STANDALONE: Handling user message:', message);
    
    // Add user message to chat
    this.addMessageToChat('user', message);
    
    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // Show typing indicator
    this.showTypingIndicator();
    
    try {
      // Get AI response from background script
      const aiResponse = await this.getAIResponse(message);
      
      this.hideTypingIndicator();
      
      // Add AI response to chat
      this.addMessageToChat('assistant', aiResponse);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      });
      
      // Play AI response as speech (only if voice is enabled and this is not the welcome message)
      if (this.voiceEnabled && this.conversationHistory.length > 1) { // More than just the welcome message
        // Start voice synthesis immediately without waiting
        this.playAIResponse(aiResponse).catch(error => {
          console.error('Voice synthesis error:', error);
        });
      }
    } catch (error) {
      console.error('❌ STANDALONE: Error getting AI response:', error);
      this.hideTypingIndicator();
      
      // Fallback to mock response if API fails
      const fallbackResponse = this.generateMockResponse(message);
      this.addMessageToChat('assistant', fallbackResponse + '\n\n⚠️ (Using fallback response - check API key)');
      
      this.conversationHistory.push({
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      });
    }
  }

  private async getAIResponse(userMessage: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Get current problem data
      const currentUrl = window.location.href;
      const match = currentUrl.match(/leetcode\.com\/problems\/([^/?]+)/);
      const problemSlug = match ? match[1] : '';
      
      // Get problem title from page
      const titleElement = document.querySelector('[data-cy="question-title"]') || 
                          document.querySelector('.css-v3d350') ||
                          document.querySelector('h1') ||
                          document.querySelector('[class*="title"]');
      
      const problemTitle = titleElement?.textContent?.trim() || 'Unknown Problem';
      
      // Create problem object
      const problem = {
        id: problemSlug,
        title: problemTitle,
        titleSlug: problemSlug,
        difficulty: this.detectDifficulty(), // Detect actual difficulty
        description: 'LeetCode problem',
        url: currentUrl
      };
      
      // Convert conversation history to the format expected by the API
      const conversationHistory = this.conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Send message to background script for AI processing
      chrome.runtime.sendMessage({
        type: 'GET_AI_RESPONSE',
        data: {
          problem: problem,
          conversationHistory: conversationHistory,
          userMessage: userMessage,
          hasAcceptedSubmission: this.hasAcceptedSubmission
        }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response?.error || 'Failed to get AI response'));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('AI response timeout'));
      }, 30000);
    });
  }

  private showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const typingDiv = document.createElement('div');
      typingDiv.id = 'typing-indicator';
      typingDiv.style.cssText = `
        display: flex;
        gap: 12px;
        animation: messageSlideIn 0.3s ease;
      `;
      typingDiv.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        ">🤖</div>
        <div style="
          display: flex;
          gap: 4px;
          padding: 12px 16px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 12px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          width: fit-content;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
          "></div>
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
            animation-delay: -0.16s;
          "></div>
          <div style="
            width: 8px;
            height: 8px;
            background: white;
            border-radius: 50%;
            animation: typing 1.4s infinite ease-in-out;
            animation-delay: -0.32s;
          "></div>
        </div>
      `;
      chatMessages.appendChild(typingDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  private hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  private addMessageToChat(role: 'user' | 'assistant', message: string) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const messageDiv = document.createElement('div');
      messageDiv.style.cssText = `
        display: flex;
        gap: 12px;
        animation: messageSlideIn 0.3s ease;
      `;
      
      const avatar = role === 'user' ? '👤' : '🤖';
      const avatarBg = role === 'user' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #3b82f6, #2563eb)';
      const messageBg = role === 'user' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)';
      const messageBorder = role === 'user' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(59, 130, 246, 0.3)';
      
      messageDiv.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
          background: ${avatarBg};
        ">${avatar}</div>
        <div style="
          flex: 1;
          background: ${messageBg};
          border: 1px solid ${messageBorder};
          padding: 12px 16px;
          border-radius: 12px;
          line-height: 1.5;
          font-size: 14px;
          color: white;
        ">${message}</div>
      `;
      
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  private generateMockResponse(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('problem') || message.includes('understand')) {
      return "Great! Now let's think about the approach. What strategies come to mind for solving this problem?";
    } else if (message.includes('approach') || message.includes('strategy')) {
      return "Excellent thinking! What's the time complexity of this approach? And can you think of any edge cases?";
    } else if (message.includes('complexity') || message.includes('time') || message.includes('space')) {
      return "Perfect! Now let's implement this solution. Go ahead and write the code in the LeetCode editor.";
    } else if (message.includes('implement') || message.includes('code')) {
      return "Great! Once you've written the code, test it with the examples. What do you think the output should be?";
    } else {
      return "That's a good point! Let's continue with the interview. What's your next step?";
    }
  }

  private testStyles() {
    console.log('🧪 STANDALONE: Testing styles...');
    
    // Create a simple test element
    const testElement = document.createElement('div');
    testElement.id = 'lm-style-test';
    testElement.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
      color: white !important;
      padding: 10px !important;
      border-radius: 8px !important;
      font-family: Arial, sans-serif !important;
      font-size: 12px !important;
      z-index: 10001 !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
    `;
    testElement.textContent = '🎨 Styles Working!';
    
    document.body.appendChild(testElement);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (testElement.parentNode) {
        testElement.parentNode.removeChild(testElement);
      }
    }, 3000);
    
    console.log('🧪 STANDALONE: Style test element added');
  }

  private setupSubmissionMonitor() {
    console.log('🚀 STANDALONE: Setting up submission monitor...');
    
    // Monitor for submission result changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check for accepted submission indicators
          this.checkForSubmissionResult();
        }
      });
    });
    
    // Start observing the document for changes
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Also check periodically for submission results
    setInterval(() => {
      this.checkForSubmissionResult();
    }, 2000);
  }

  private checkForSubmissionResult() {
    // Only check if interview is active
    if (!this.isInterviewActive) {
      return;
    }
    
    // Prevent spam by checking time since last detection
    const now = Date.now();
    if (this.lastSubmissionCheck && (now - this.lastSubmissionCheck) < 10000) {
      return; // Wait at least 10 seconds between checks
    }
    
    // Look for specific LeetCode success indicators
    const successSelectors = [
      '[data-e2e-locator="console-result-success"]',
      '.text-green-s', 
      '.text-success',
      '[class*="accepted"]',
      '.accepted',
      '.success'
    ];
    
    for (const selector of successSelectors) {
      const successElements = document.querySelectorAll(selector);
      for (const element of successElements) {
        const htmlElement = element as HTMLElement;
        if (htmlElement.textContent?.toLowerCase().includes('accepted') &&
            htmlElement.offsetParent !== null) { // Element is visible
          console.log('🎉 STANDALONE: Accepted submission detected via selector:', selector);
          this.handleAcceptedSubmission();
          this.lastSubmissionCheck = now;
          return;
        }
      }
    }
    
    // Look for specific accepted result patterns in submission panels
    const submissionPanels = document.querySelectorAll('[data-e2e-locator*="console"], [class*="result"], [class*="submission"]');
    for (const panel of submissionPanels) {
      const panelText = panel.textContent?.toLowerCase() || '';
      if (panelText.includes('accepted') && 
          panelText.includes('runtime') &&
          panel.getBoundingClientRect().width > 0) { // Panel is visible
        console.log('🎉 STANDALONE: Accepted submission detected via panel!');
        this.handleAcceptedSubmission();
        this.lastSubmissionCheck = now;
        return;
      }
    }
  }

  private handleAcceptedSubmission() {
    if (this.isInterviewActive && this.conversationHistory.length > 0 && !this.hasAcceptedSubmission) {
      console.log('🎉 STANDALONE: Adding accepted submission message to chat');
      
      this.hasAcceptedSubmission = true;
      
      const successMessage = "Excellent! I see your solution was accepted. 🎉\n\nGreat work getting a working solution! This is exactly what we'd discuss in a real interview. Feel free to ask me any questions about your approach, or we can move on to discussing optimizations if you'd like.";
      
      // Add the success message to chat (don't read aloud - it's a system message)
      this.addMessageToChat('assistant', successMessage);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: successMessage,
        timestamp: new Date()
      });
      
      // Show a notification
      this.showNotification('🎉 Solution Accepted! Great job!', 'success');
    }
  }

  private isInCodeEditor(): boolean {
    // Check if we're in the code editor section
    const codeEditorSelectors = [
      '[data-e2e-locator="code-editor"]',
      '.monaco-editor',
      '[class*="editor"]',
      '[class*="code"]',
      '.CodeMirror'
    ];
    
    for (const selector of codeEditorSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Also check URL for code editor indicators
    return window.location.href.includes('/code') || 
           window.location.href.includes('/editor') ||
           window.location.pathname.includes('code');
  }

  private suggestCodeEditor() {
    if (this.isInterviewActive && !this.isInCodeEditor()) {
      const suggestionMessage = "💡 **Tip:** I notice you're not in the code editor. To implement your solution, click on the 'Code' tab or use the LeetCode code editor. I'll be here to help guide you through the implementation!";
      
      // Add the suggestion to chat
      this.addMessageToChat('assistant', suggestionMessage);
      
      // Add to conversation history
      this.conversationHistory.push({
        role: 'assistant',
        content: suggestionMessage,
        timestamp: new Date()
      });
    }
  }

  private async toggleVoiceRecording() {
    // If already recording, don't start again (for spacebar hold)
    if (this.isRecording) {
      return;
    }
    
    await this.startRecording();
  }

  private async startRecording() {
    try {
      console.log('🎤 STANDALONE: Starting voice recording...');
      
      const voiceBtn = document.getElementById('voice-record-btn') as HTMLButtonElement;
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        } 
      });
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        console.log('🎤 STANDALONE: Recording stopped, processing audio...');
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processVoiceInput(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      // Update button appearance
      if (voiceBtn) {
        voiceBtn.innerHTML = '<span style="color: white; font-size: 16px;">⏹️</span>';
        voiceBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        voiceBtn.style.animation = 'pulse 1s infinite';
      }
      
      this.showNotification('🎤 Recording... Release Spacebar to stop', 'info');
      
    } catch (error) {
      console.error('❌ STANDALONE: Error starting recording:', error);
      this.showNotification('❌ Could not access microphone. Please check permissions.', 'error');
    }
  }

  private async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      console.log('🎤 STANDALONE: Stopping recording...');
      
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      const voiceBtn = document.getElementById('voice-record-btn') as HTMLButtonElement;
      if (voiceBtn) {
        voiceBtn.innerHTML = '<span style="color: white; font-size: 16px;">🎤</span>';
        voiceBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        voiceBtn.style.animation = 'none';
      }
      
      this.showNotification('🔄 Processing speech...', 'info');
    }
  }

  private async processVoiceInput(audioBlob: Blob) {
    try {
      console.log('🔄 STANDALONE: Processing voice input...');
      
      // Send to background script for Whisper transcription
      const response = await this.transcribeAudio(audioBlob);
      
      if (response && response.text) {
        console.log('✅ STANDALONE: Transcription successful:', response.text);
        
        // Add transcribed text to input field and auto-send
        const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
        if (userInput) {
          userInput.value = response.text;
          userInput.style.height = 'auto';
          userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
          
          // Auto-send the transcribed message
          this.showNotification('✅ Speech transcribed - sending message...', 'success');
          setTimeout(() => {
            this.sendMessage();
          }, 500); // Small delay to show the transcription briefly
        }
      } else {
        throw new Error('No transcription received');
      }
      
    } catch (error) {
      console.error('❌ STANDALONE: Error processing voice input:', error);
      this.showNotification('❌ Failed to process speech. Please try again.', 'error');
    }
  }

  private async transcribeAudio(audioBlob: Blob): Promise<{ text: string } | null> {
    return new Promise((resolve, reject) => {
      // Convert blob to base64 for transmission
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        
        chrome.runtime.sendMessage({
          type: 'TRANSCRIBE_AUDIO',
          data: { 
            audioData: base64Audio,
            mimeType: audioBlob.type
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (response && response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Failed to transcribe audio'));
          }
        });
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read audio data'));
      };
      
      reader.readAsDataURL(audioBlob);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Transcription timeout'));
      }, 30000);
    });
  }

  private async synthesizeSpeech(text: string, voice: string = 'nova'): Promise<string | null> {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'SYNTHESIZE_SPEECH',
        data: { text, voice, speed: this.voiceSpeed }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        
        if (response && response.success) {
          resolve(response.data.audioData);
        } else {
          reject(new Error(response?.error || 'Failed to synthesize speech'));
        }
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Speech synthesis timeout'));
      }, 30000);
    });
  }

  private async playAIResponse(text: string) {
    if (!this.voiceEnabled) return;
    
    // Stop any currently playing audio
    this.stopCurrentVoice();
    
    try {
      console.log('🔊 STANDALONE: Synthesizing AI response...');
      
      const audioData = await this.synthesizeSpeech(text);
      if (audioData) {
        const audio = new Audio(audioData);
        audio.volume = 0.8;
        
        // Store reference to current audio
        this.currentAudio = audio;
        
        audio.onplay = () => {
          console.log('🔊 STANDALONE: Playing AI response audio');
          this.showNotification('🔊 Playing AI response...', 'info');
          this.showSkipButton(true);
        };
        
        audio.onended = () => {
          console.log('✅ STANDALONE: AI response audio finished');
          this.currentAudio = null;
          this.showSkipButton(false);
        };
        
        audio.onerror = (error) => {
          console.error('❌ STANDALONE: Audio playback error:', error);
          this.showNotification('❌ Audio playback failed', 'error');
          this.currentAudio = null;
          this.showSkipButton(false);
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error('❌ STANDALONE: Error playing AI response:', error);
      // Don't show error notification for voice synthesis failures
      // as it's not critical to the interview experience
    }
  }

  private stopCurrentVoice() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.showSkipButton(false);
      console.log('🔇 STANDALONE: Stopped current voice playback');
    }
  }

  private skipCurrentVoice() {
    this.stopCurrentVoice();
    this.showNotification('⏭️ Voice response skipped', 'info');
  }

  private showSkipButton(show: boolean) {
    const skipBtn = document.getElementById('skip-voice-btn');
    if (skipBtn) {
      skipBtn.style.display = show ? 'block' : 'none';
    }
  }

  private toggleVoiceEnabled() {
    this.voiceEnabled = !this.voiceEnabled;
    
    const voiceToggleBtn = document.getElementById('voice-toggle-btn');
    if (voiceToggleBtn) {
      if (this.voiceEnabled) {
        voiceToggleBtn.textContent = '🔊 Voice ON';
        voiceToggleBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        this.showNotification('🔊 Voice responses enabled', 'success');
      } else {
        voiceToggleBtn.textContent = '🔇 Voice OFF';
        voiceToggleBtn.style.background = 'rgba(255, 100, 100, 0.3)';
        this.showNotification('🔇 Voice responses disabled', 'info');
      }
    }
  }

  private setVoiceSpeed(speed: number) {
    this.voiceSpeed = speed;
    
    // Update button styles
    const speedSlowBtn = document.getElementById('voice-speed-slow');
    const speedNormalBtn = document.getElementById('voice-speed-normal');
    const speedFastBtn = document.getElementById('voice-speed-fast');
    
    // Reset all buttons to default style
    [speedSlowBtn, speedNormalBtn, speedFastBtn].forEach(btn => {
      if (btn) {
        btn.style.background = 'rgba(255, 255, 255, 0.1)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
      }
    });
    
    // Highlight selected speed
    if (speed === 0.5 && speedSlowBtn) {
      speedSlowBtn.style.background = 'rgba(59, 130, 246, 0.3)';
      speedSlowBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    } else if (speed === 1.0 && speedNormalBtn) {
      speedNormalBtn.style.background = 'rgba(59, 130, 246, 0.3)';
      speedNormalBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    } else if (speed === 1.5 && speedFastBtn) {
      speedFastBtn.style.background = 'rgba(59, 130, 246, 0.3)';
      speedFastBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
    }
    
    this.showNotification(`🔊 Voice speed set to ${speed}x`, 'success');
  }

  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    // Check if the active element is an input field
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(activeElement.tagName.toLowerCase()) || 
           activeElement.getAttribute('contenteditable') === 'true';
  }
}

// Prevent multiple instances
if (!(window as any).leetmentorStandalone) {
  console.log('🚀 STANDALONE: About to create StandaloneAIInterviewer instance...');
  const standaloneInterviewer = new StandaloneAIInterviewer();
  
  // Export for debugging
  (window as any).leetmentorStandalone = standaloneInterviewer;
  
  console.log('✅ STANDALONE: Content script loaded successfully!');
} else {
  console.log('⚠️ STANDALONE: Instance already exists, skipping initialization');
}
