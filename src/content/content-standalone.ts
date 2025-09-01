console.log('🚀 STANDALONE: Content script loading...');
console.log('🚀 STANDALONE: URL:', window.location.href);

/**
 * Standalone AI Interviewer Content Script
 *
 * This version is completely self-contained to avoid CSP issues
 * No external imports, no webpack chunks, pure vanilla JavaScript
 *
 * TODO: Refactor to use React components and Tailwind CSS for better DX
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
  private lastTranscriptionTime: number = 0;
  private transcriptionCooldown: number = 2000; // 2 seconds between transcriptions

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



    // Create interview interface with enhanced inline styles
    const interviewInterface = document.createElement('div');
    interviewInterface.id = 'leetmentor-standalone';
    
    const problemTitle = problem?.title || 'Unknown Problem';
    const difficulty = problem?.difficulty || 'Medium';
    const difficultyColor = this.getDifficultyColor(difficulty);
    
    // Enhanced UI with better visual hierarchy and modern design
    interviewInterface.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 0;
        margin: 24px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: white;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        position: relative;
        z-index: 10000;
        transform: translateY(0);
        opacity: 1;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
        ">
        
        <!-- Header Section -->
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px 28px;
          position: relative;
        ">
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 16px;
            ">
              <div style="
                font-size: 28px;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
                width: 56px;
                height: 56px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
              ">${this.getTargetIcon(24)}</div>
              <div style="line-height: 1.3;">
                <div style="
                  font-size: 24px;
                  font-weight: 800;
                  letter-spacing: -0.5px;
                  color: white;
                  margin-bottom: 4px;
                ">LeetMentor</div>
                <div style="
                  font-size: 13px;
                  opacity: 0.9;
                  font-weight: 500;
                  color: rgba(255, 255, 255, 0.9);
                  letter-spacing: 0.5px;
                ">AI INTERVIEW ASSISTANT</div>
              </div>
            </div>
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 14px;
              font-weight: 600;
              color: white;
            ">
              <div style="
                width: 10px;
                height: 10px;
                background: #22c55e;
                border-radius: 50%;
                animation: pulse 2s infinite;
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
              "></div>
              <span style="letter-spacing: 0.5px;">READY</span>
            </div>
          </div>
        </div>
        
        <!-- Problem Info Section -->
        <div style="
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0;
          padding: 20px 28px;
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        ">
          <div style="
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 12px;
            line-height: 1.4;
            color: white;
            letter-spacing: -0.3px;
          ">${problemTitle}</div>
          <div style="
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 16px;
            border-radius: 25px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: white;
            background: ${difficultyColor};
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.2);
          ">
            <div style="
              width: 6px;
              height: 6px;
              background: white;
              border-radius: 50%;
              opacity: 0.8;
            "></div>
            ${difficulty}
          </div>
        </div>
        
        <!-- Action Buttons Section -->
        <div style="
          padding: 24px 28px;
          display: flex;
          gap: 16px;
          align-items: center;
        ">
          <button id="start-interview-btn" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px 24px;
            border: none;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            min-width: 0;
            flex: 1;
            justify-content: center;
            font-family: inherit;
            background: linear-gradient(135deg, #22c55e, #16a34a);
            color: white;
            box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            letter-spacing: 0.3px;
          " onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 12px 32px rgba(34, 197, 94, 0.4)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 24px rgba(34, 197, 94, 0.3)'">
            ${this.getMicIcon(18)}
            <span style="margin-left:8px">Start Interview</span>
          </button>
          
          <button id="settings-btn" style="
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 16px;
            border: none;
            border-radius: 14px;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            min-width: 0;
            flex: 0 0 auto;
            font-family: inherit;
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          " onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.background='rgba(255, 255, 255, 0.1)'" aria-label="Settings" title="Settings">
            ${this.getSettingsIcon(18)}
          </button>
        </div>
        
                <!-- Chat Interface (Hidden by default) -->
        <div id="chat-container" style="
          background: rgba(255, 255, 255, 0.02);
          border-radius: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          display: none;
          max-height: 800px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        ">
          <!-- Chat Header -->
          <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 28px;
            background: rgba(255, 255, 255, 0.05);
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 12px;
            ">
              <div style="
                width: 8px;
                height: 8px;
                background: #22c55e;
                border-radius: 50%;
                animation: pulse 2s infinite;
              "></div>
              <div style="
                font-size: 16px;
                font-weight: 700;
                color: white;
                letter-spacing: 0.3px;
              ">Interview Session</div>
            </div>
            <div style="display: flex; gap: 12px;">
              <button id="clear-chat-btn" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                letter-spacing: 0.3px;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">Clear</button>
              <button id="export-chat-btn" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: white;
                padding: 8px 16px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                letter-spacing: 0.3px;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">Export</button>
            </div>
          </div>
          
          <!-- Chat Messages -->
          <div id="chat-messages" style="
            flex: 1;
            overflow-y: auto;
            padding: 24px 28px;
            display: flex;
            flex-direction: column;
            gap: 20px;
            scroll-behavior: smooth;
            min-height: 150px;
            max-height: 500px;
          "></div>
          
          <!-- Chat Input Section -->
          <div style="
            padding: 24px 28px;
            background: rgba(255, 255, 255, 0.02);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            flex-shrink: 0;
            position: relative;
            z-index: 10;
          ">
            <div style="
              display: flex;
              gap: 16px;
              align-items: flex-end;
            ">
              <textarea id="user-input" style="
                flex: 1;
                background: rgba(255, 255, 255, 0.08);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 16px;
                padding: 16px 20px;
                color: white;
                font-size: 15px;
                font-family: inherit;
                font-weight: 500;
                resize: none;
                min-height: 52px;
                max-height: 120px;
                transition: all 0.3s ease;
                line-height: 1.5;
              " placeholder="Type your response or use voice..." rows="1" onfocus="this.style.borderColor='rgba(59, 130, 246, 0.6)'; this.style.background='rgba(255, 255, 255, 0.12)'; this.style.boxShadow='0 0 0 4px rgba(59, 130, 246, 0.1)'" onblur="this.style.borderColor='rgba(255, 255, 255, 0.15)'; this.style.background='rgba(255, 255, 255, 0.08)'; this.style.boxShadow='none'"></textarea>
              
              <button id="voice-record-btn" style="
                background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                border: none;
                border-radius: 16px;
                width: 52px;
                height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                flex-shrink: 0;
                box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
              " onmouseover="this.style.transform='translateY(-2px) scale(1.05)'; this.style.boxShadow='0 12px 32px rgba(139, 92, 246, 0.4)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 24px rgba(139, 92, 246, 0.3)'" aria-label="Record voice" title="Record voice">
                ${this.getMicIcon(18)}
              </button>
              
              <button id="send-btn" style="
                background: linear-gradient(135deg, #22c55e, #16a34a);
                border: none;
                border-radius: 16px;
                width: 52px;
                height: 52px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                flex-shrink: 0;
                box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
              " onmouseover="this.style.transform='translateY(-2px) scale(1.05)'; this.style.boxShadow='0 12px 32px rgba(34, 197, 94, 0.4)'" onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 8px 24px rgba(34, 197, 94, 0.3)'" aria-label="Send message" title="Send message">
                ${this.getSendIcon(18)}
              </button>
            </div>
            
            <!-- Voice Controls -->
            <div style="
              margin-top: 16px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 13px;
              opacity: 0.8;
              color: white;
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
              ">
                <span>${this.getLightbulbIcon(14)}</span>
                <span>Press Enter to send • Hold Spacebar for voice • Esc to unfocus</span>
              </div>
              
              <div style="display: flex; gap: 8px; align-items: center;">
                <button id="skip-voice-btn" style="
                  background: rgba(239, 68, 68, 0.2);
                  border: 1px solid rgba(239, 68, 68, 0.4);
                  color: white;
                  padding: 6px 12px;
                  border-radius: 8px;
                  font-size: 11px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.2s ease;
                  display: none;
                  letter-spacing: 0.3px;
                " onmouseover="this.style.background='rgba(239, 68, 68, 0.3)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">${this.getSkipIcon(14)} <span style="margin-left:4px">Skip Voice</span></button>
                
                <div style="display: flex; gap: 6px; align-items: center;">
                  <button id="voice-speed-slow" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    letter-spacing: 0.3px;
                  " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">0.5x</button>
                  <button id="voice-speed-normal" style="
                    background: rgba(59, 130, 246, 0.3);
                    border: 1px solid rgba(59, 130, 246, 0.5);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    letter-spacing: 0.3px;
                  " onmouseover="this.style.background='rgba(59, 130, 246, 0.4)'" onmouseout="this.style.background='rgba(59, 130, 246, 0.3)'">1.0x</button>
                  <button id="voice-speed-fast" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    letter-spacing: 0.3px;
                  " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">1.5x</button>
                  <button id="voice-toggle-btn" style="
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 11px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    letter-spacing: 0.3px;
                  " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">${this.getVolumeOnIcon(14)} <span style="margin-left:4px">Voice ON</span></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.insertBefore(interviewInterface, container.firstChild);
    console.log('✅ STANDALONE: Interview interface injected successfully!');
    
    // Add entrance animation
    interviewInterface.style.opacity = '0';
    interviewInterface.style.transform = 'translateY(20px) scale(0.95)';
    
    setTimeout(() => {
      interviewInterface.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
      interviewInterface.style.opacity = '1';
      interviewInterface.style.transform = 'translateY(0) scale(1)';
    }, 100);
    
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
      chatContainer.style.display = 'flex';
      startBtn.innerHTML = `${this.getTargetIcon(18)}<span style="margin-left:8px">Interview Active</span>`;
      startBtn.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      startBtn.style.boxShadow = '0 8px 24px rgba(245, 158, 11, 0.4)';
      this.isInterviewActive = true;
      
      // Add welcome message (don't read this one aloud)
      this.addMessageToChat('assistant', "Hi! I'm your technical interviewer today. We'll be doing a 45-minute coding interview focusing on problem-solving and algorithm design.\n\nCan you explain this problem in your own words? What are the key inputs and expected outputs?\n\n*Remember: You'll implement your solution in the LeetCode code editor, and we'll discuss your approach, complexity analysis, and optimizations together.*");
      
      // Setup chat input
      this.setupChatInput();
      
      // Ensure input area is visible
      setTimeout(() => {
        this.ensureInputVisible();
      }, 500);
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
        voiceBtn.innerHTML = `${this.getVolumeOnIcon(14)}<span style="margin-left:6px">Test Voice</span>`;
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
    
    const colors = {
      success: { bg: '#22c55e', border: '#16a34a' },
      error: { bg: '#ef4444', border: '#dc2626' },
      warning: { bg: '#f59e0b', border: '#d97706' },
      info: { bg: '#3b82f6', border: '#2563eb' }
    } as const;
    
    const color = colors[type];
    
    notification.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: linear-gradient(135deg, ${color.bg}, ${color.border});
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transform: translateX(100%) scale(0.9);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 12px;
      letter-spacing: 0.3px;
    `;
    
    notification.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center">${this.getNotificationIcon(type)}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0) scale(1)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%) scale(0.9)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 4000);
  }

  private getNotificationIcon(type: 'success' | 'error' | 'warning' | 'info'): string {
    const base = 'width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    switch (type) {
      case 'success':
        return `<svg ${base}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
      case 'error':
        return `<svg ${base}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
      case 'warning':
        return `<svg ${base}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      case 'info':
      default:
        return `<svg ${base}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }
  }

  // Inline SVG icon helpers for UI elements
  private svgBase(size: number) {
    return `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="flex-shrink:0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  }

  private getMicIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  }

  private getSendIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`;
  }

  private getSettingsIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="M12 8a4 4 0 1 0 4 4 4 4 0 0 0-4-4Z"/><path d="M3.05 13a9 9 0 0 1 0-2l2.11-.35a1 1 0 0 0 .76-.57l1-1.73a1 1 0 0 0-.22-1.18L5.4 4.6a9 9 0 0 1 1.41-1.41l1.52 1.3a1 1 0 0 0 1.18.22l1.73-1a1 1 0 0 0 .57-.76L13 1.05a9 9 0 0 1 2 0l.35 2.11a1 1 0 0 0 .57.76l1.73 1a1 1 0 0 0 1.18-.22l1.3-1.52A9 9 0 0 1 21.4 4.6l-1.3 1.52a1 1 0 0 0-.22 1.18l1 1.73a1 1 0 0 0 .76.57L22.95 11a9 9 0 0 1 0 2l-2.11.35a1 1 0 0 0-.76.57l-1 1.73a1 1 0 0 0 .22 1.18l1.3 1.52a9 9 0 0 1-1.41 1.41l-1.52-1.3a1 1 0 0 0-1.18-.22l-1.73 1a1 1 0 0 0-.57.76L13 22.95a9 9 0 0 1-2 0l-.35-2.11a1 1 0 0 0-.57-.76l-1.73-1a1 1 0 0 0-1.18.22l-1.52 1.3A9 9 0 0 1 4.6 21.4l1.3-1.52a1 1 0 0 0 .22-1.18l-1-1.73a1 1 0 0 0-.76-.57Z"/></svg>`;
  }

  private getLightbulbIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M2 11a10 10 0 1 1 20 0c0 3.93-2.67 5.05-4 7H6c-1.33-1.95-4-3.07-4-7Z"/></svg>`;
  }

  private getSkipIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="m7 7 10 10"/><path d="m17 7-10 10"/></svg>`;
  }

  private getVolumeOnIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M19 12a7 7 0 0 0-7-7"/><path d="M19 12a7 7 0 0 1-7 7"/></svg>`;
  }

  private getVolumeOffIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
  }

  private getTargetIcon(size = 16): string {
    return `<svg ${this.svgBase(size)}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`;
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
        gap: 16px;
        animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 8px;
      `;
      typingDiv.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">🤖</div>
        <div style="
          display: flex;
          gap: 6px;
          padding: 16px 20px;
          background: rgba(59, 130, 246, 0.15);
          border-radius: 16px;
          border: 1px solid rgba(59, 130, 246, 0.25);
          width: fit-content;
          backdrop-filter: blur(10px);
        ">
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            animation: typing 1.6s infinite ease-in-out;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "></div>
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            animation: typing 1.6s infinite ease-in-out;
            animation-delay: -0.2s;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          "></div>
          <div style="
            width: 10px;
            height: 10px;
            background: white;
            border-radius: 50%;
            animation: typing 1.6s infinite ease-in-out;
            animation-delay: -0.4s;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
        gap: 16px;
        animation: messageSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 8px;
      `;
      
      const avatar = role === 'user' ? '👤' : '🤖';
      const avatarBg = role === 'user' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #3b82f6, #2563eb)';
      const messageBg = role === 'user' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)';
      const messageBorder = role === 'user' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(59, 130, 246, 0.25)';
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      messageDiv.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          background: ${avatarBg};
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">${avatar}</div>
        <div style="
          flex: 1;
          background: ${messageBg};
          border: 1px solid ${messageBorder};
          padding: 16px 20px;
          border-radius: 16px;
          line-height: 1.6;
          font-size: 15px;
          color: white;
          backdrop-filter: blur(10px);
          position: relative;
        ">
          <div style="
            margin-bottom: 8px;
            font-size: 12px;
            opacity: 0.7;
            font-weight: 600;
            letter-spacing: 0.3px;
          ">${role === 'user' ? 'You' : 'AI Interviewer'} • ${timestamp}</div>
          <div style="
            white-space: pre-wrap;
            word-wrap: break-word;
          ">${message}</div>
        </div>
      `;
      
      chatMessages.appendChild(messageDiv);
      
      // Ensure the input area is visible after adding a message
      setTimeout(() => {
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
      }, 100);
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
    } else if (message.includes('api') || message.includes('quota') || message.includes('billing')) {
      return "I see you're having API issues. Don't worry! You can continue the interview by typing your responses. The voice features will be available once the API quota is resolved. What would you like to discuss about the problem?";
    } else {
      return "That's a good point! Let's continue with the interview. What's your next step?";
    }
  }

  // private testStyles() {
  //   console.log('🧪 STANDALONE: Testing styles...');
    
  //   // Create a simple test element
  //   const testElement = document.createElement('div');
  //   testElement.id = 'lm-style-test';
  //   testElement.style.cssText = `
  //     position: fixed !important;
  //     top: 10px !important;
  //     right: 10px !important;
  //     background: linear-gradient(135deg, #ff6b6b, #ee5a24) !important;
  //     color: white !important;
  //     padding: 10px !important;
  //     border-radius: 8px !important;
  //     font-family: Arial, sans-serif !important;
  //     font-size: 12px !important;
  //     z-index: 10001 !important;
  //     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
  //   `;
  //   testElement.textContent = '🎨 Styles Working!';
    
  //   document.body.appendChild(testElement);
    
  //   // Remove after 3 seconds
  //   setTimeout(() => {
  //     if (testElement.parentNode) {
  //       testElement.parentNode.removeChild(testElement);
  //     }
  //   }, 3000);
    
  //   console.log('🧪 STANDALONE: Style test element added');
  // }

  private addAnimations() {
    console.log('🎬 STANDALONE: Adding CSS animations...');
    
    // Create style element for animations
    const styleElement = document.createElement('style');
    styleElement.id = 'leetmentor-animations';
    styleElement.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes typing {
        0%, 80%, 100% { 
          transform: scale(0.8);
          opacity: 0.5;
        }
        40% { 
          transform: scale(1);
          opacity: 1;
        }
      }
      
      @keyframes messageSlideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      
      @keyframes slideInFromRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes bounce {
        0%, 20%, 53%, 80%, 100% {
          transform: translate3d(0,0,0);
        }
        40%, 43% {
          transform: translate3d(0, -8px, 0);
        }
        70% {
          transform: translate3d(0, -4px, 0);
        }
        90% {
          transform: translate3d(0, -2px, 0);
        }
      }
    `;
    
    document.head.appendChild(styleElement);
    console.log('🎬 STANDALONE: CSS animations added');
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
      this.showNotification('Solution Accepted! Great job!', 'success');
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
      const recordingStartTime = Date.now();
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = async () => {
        console.log('🎤 STANDALONE: Recording stopped, processing audio...');
        const recordingDuration = (Date.now() - recordingStartTime) / 1000;
        
        // Check minimum recording duration
        if (recordingDuration < 0.5) {
          this.showNotification('Recording too short. Please hold longer for voice input.', 'warning');
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        await this.processVoiceInput(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      this.mediaRecorder.start(100); // Collect data every 100ms
      this.isRecording = true;
      
      // Update button appearance
      if (voiceBtn) {
        voiceBtn.innerHTML = '<span style="color: white; font-size: 18px;">⏹️</span>';
        voiceBtn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
        voiceBtn.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.4)';
        voiceBtn.style.animation = 'pulse 1.5s infinite';
        voiceBtn.style.transform = 'scale(1.05)';
      }
      
      this.showNotification('Recording... Hold Spacebar for at least 0.5 seconds', 'info');
      
    } catch (error) {
      console.error('❌ STANDALONE: Error starting recording:', error);
      this.showNotification('Could not access microphone. Please check permissions.', 'error');
    }
  }

  private async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      console.log('🎤 STANDALONE: Stopping recording...');
      
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      const voiceBtn = document.getElementById('voice-record-btn') as HTMLButtonElement;
      if (voiceBtn) {
        voiceBtn.innerHTML = this.getMicIcon(18);
        voiceBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
        voiceBtn.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.3)';
        voiceBtn.style.animation = 'none';
        voiceBtn.style.transform = 'scale(1)';
      }
      
    this.showNotification('Processing speech...', 'info');
    }
  }

  private async processVoiceInput(audioBlob: Blob) {
    try {
      console.log('🔄 STANDALONE: Processing voice input...');
      
      // Check rate limiting
      const now = Date.now();
      if (now - this.lastTranscriptionTime < this.transcriptionCooldown) {
        const remainingTime = Math.ceil((this.transcriptionCooldown - (now - this.lastTranscriptionTime)) / 1000);
        this.showNotification(`Please wait ${remainingTime} seconds before trying again`, 'warning');
        return;
      }
      
      // Check audio length (minimum 0.5 seconds)
      const audioDuration = audioBlob.size / 16000; // Rough estimate
      if (audioDuration < 0.5) {
        this.showNotification('Recording too short. Please hold longer for voice input.', 'warning');
        return;
      }
      
      this.lastTranscriptionTime = now;
      
      // Send to background script for Whisper transcription
      const response = await this.transcribeAudio(audioBlob);
      
      if (response && response.text && response.text.trim()) {
        console.log('✅ STANDALONE: Transcription successful:', response.text);
        
        // Add transcribed text to input field and auto-send
        const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
        if (userInput) {
          userInput.value = response.text;
          userInput.style.height = 'auto';
          userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
          
          // Auto-send the transcribed message
          this.showNotification('Speech transcribed - sending message...', 'success');
          setTimeout(() => {
            this.sendMessage();
          }, 500); // Small delay to show the transcription briefly
        }
      } else {
        throw new Error('No transcription received or empty result');
      }
      
    } catch (error) {
      console.error('❌ STANDALONE: Error processing voice input:', error);
      
      // Handle specific error types
      const errorMessage = error.toString();
      if (errorMessage.includes('insufficient_quota') || errorMessage.includes('quota')) {
        this.showNotification('API quota exceeded. Please check your OpenAI billing.', 'error');
      } else if (errorMessage.includes('audio_too_short')) {
        this.showNotification('Recording too short. Please hold longer for voice input.', 'warning');
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
        this.showNotification('Rate limit exceeded. Please wait a moment before trying again.', 'warning');
      } else {
        this.showNotification('Failed to process speech. Please try again.', 'error');
      }
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
          this.showNotification('Playing AI response...', 'info');
          this.showSkipButton(true);
        };
        
        audio.onended = () => {
          console.log('✅ STANDALONE: AI response audio finished');
          this.currentAudio = null;
          this.showSkipButton(false);
        };
        
        audio.onerror = (error) => {
          console.error('❌ STANDALONE: Audio playback error:', error);
          this.showNotification('Audio playback failed', 'error');
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
    this.showNotification('Voice response skipped', 'info');
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
        voiceToggleBtn.innerHTML = `${this.getVolumeOnIcon(14)} <span style="margin-left:4px">Voice ON</span>`;
        voiceToggleBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        voiceToggleBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        voiceToggleBtn.style.color = '#22c55e';
        this.showNotification('Voice responses enabled', 'success');
      } else {
        voiceToggleBtn.innerHTML = `${this.getVolumeOffIcon(14)} <span style=\"margin-left:4px\">Voice OFF</span>`;
        voiceToggleBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        voiceToggleBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
        voiceToggleBtn.style.color = '#ef4444';
        this.showNotification('Voice responses disabled', 'info');
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
    
    this.showNotification(`Voice speed set to ${speed}x`, 'success');
  }

  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    // Check if the active element is an input field
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(activeElement.tagName.toLowerCase()) || 
           activeElement.getAttribute('contenteditable') === 'true';
  }

  private ensureInputVisible() {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input') as HTMLTextAreaElement;
    
    if (chatContainer && userInput) {
      // Scroll to the input area
      userInput.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'end',
        inline: 'nearest'
      });
      
      // Also ensure the chat container shows the bottom
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 100);
    }
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
