import { LeetCodeProblem, InterviewSession } from '../types/leetcode';
import { ExtensionConfig } from '../types/api';

// Chrome extension service worker for LeetMentor
class BackgroundService {
  private sessions: Map<string, InterviewSession> = new Map();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Handle extension installation
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('LeetMentor installed:', details.reason);
      this.initializeExtension();
    });

    // Handle messages from content script and popup
    chrome.runtime.onMessage.addListener(
      (message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep the message channel open for async responses
      }
    );

    // Handle tab updates to detect navigation to LeetCode
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url?.includes('leetcode.com/problems/')) {
        this.handleLeetCodeNavigation(tabId, tab.url);
      }
    });
  }

  private async initializeExtension() {
    // Set default configuration
    const defaultConfig: ExtensionConfig = {
      apiKey: '',
      model: 'gpt-4',
      voice: {
        enabled: true,
        language: 'en-US',
        rate: 1,
        pitch: 1,
        volume: 1
      },
      speechRecognition: {
        enabled: true,
        language: 'en-US',
        continuous: true,
        interimResults: true
      },
      interviewMode: 'intermediate',
      practiceAreas: ['algorithms', 'data-structures']
    };

    const result = await chrome.storage.sync.get(['config']);
    if (!result.config) {
      await chrome.storage.sync.set({ config: defaultConfig });
    }
  }

  private async handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) {
    try {
      switch (message.type) {
        case 'DETECT_PROBLEM':
          const problem = await this.detectLeetCodeProblem(sender.tab?.id);
          sendResponse({ success: true, data: problem });
          break;

        case 'START_INTERVIEW':
          const session = await this.startInterviewSession(message.data.problem);
          sendResponse({ success: true, data: session });
          break;

        case 'END_INTERVIEW':
          await this.endInterviewSession(message.data.sessionId);
          sendResponse({ success: true });
          break;

        case 'SAVE_MESSAGE':
          await this.saveInterviewMessage(message.data.sessionId, message.data.message);
          sendResponse({ success: true });
          break;

        case 'GET_CONFIG':
          const config = await this.getConfig();
          sendResponse({ success: true, data: config });
          break;

        case 'UPDATE_CONFIG':
          await this.updateConfig(message.data.config);
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleLeetCodeNavigation(tabId: number, url: string) {
    // Notify content script that we're on a LeetCode problem page
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'NAVIGATION_DETECTED',
        data: { url }
      });
    } catch (error) {
      // Content script might not be ready yet, that's okay
      console.log('Could not send navigation message to content script');
    }
  }

  private async detectLeetCodeProblem(tabId?: number): Promise<LeetCodeProblem | null> {
    if (!tabId) return null;

    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'EXTRACT_PROBLEM_DATA'
      });

      return response.success ? response.data : null;
    } catch (error) {
      console.log('Could not communicate with content script - this is normal for the interview tab');
      
      // Try to get problem data from storage as fallback
      try {
        const problemData = await chrome.storage.local.get(['leetmentor_current_problem']);
        return problemData.leetmentor_current_problem || null;
      } catch (storageError) {
        console.error('Failed to get problem from storage:', storageError);
        return null;
      }
    }
  }

  private async startInterviewSession(problem: LeetCodeProblem): Promise<InterviewSession> {
    const sessionId = this.generateSessionId();
    const session: InterviewSession = {
      id: sessionId,
      problemId: problem.id,
      startTime: new Date(),
      status: 'active',
      transcript: []
    };

    this.sessions.set(sessionId, session);
    
    // Save to storage for persistence
    await chrome.storage.local.set({
      [`session_${sessionId}`]: session
    });

    return session;
  }

  private async endInterviewSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      session.endTime = new Date();
      
      await chrome.storage.local.set({
        [`session_${sessionId}`]: session
      });
    }
  }

  private async saveInterviewMessage(sessionId: string, message: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.transcript.push(message);
      
      await chrome.storage.local.set({
        [`session_${sessionId}`]: session
      });
    }
  }

  private async getConfig(): Promise<ExtensionConfig> {
    const result = await chrome.storage.sync.get(['config']);
    return result.config;
  }

  private async updateConfig(config: Partial<ExtensionConfig>): Promise<void> {
    const currentConfig = await this.getConfig();
    const updatedConfig = { ...currentConfig, ...config };
    await chrome.storage.sync.set({ config: updatedConfig });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Initialize the background service
new BackgroundService();
