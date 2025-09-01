import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import StandaloneInterface from './components/StandaloneInterface';
import { VoiceService } from '../shared/voice-service';
import { RealtimeVoiceService } from '../shared/realtime-voice-service';
import { ChatGPTService } from '../shared/chatgpt-service';
import { ChatGPTMessage } from '../types/api';
import { INTERVIEW_PROMPTS } from '../shared/constants';
import './styles.css'; // Import Tailwind and custom styles

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface Problem {
    id: string;
    title: string;
    titleSlug: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    description?: string;
    url?: string;
}

// Export the class to global scope for testing
declare global {
    interface Window {
        StandaloneReactInterviewer: typeof StandaloneReactInterviewer;
    }
}

class StandaloneReactInterviewer {
    private isInjected = false;
    private currentPhase = 'problem-understanding';
    private conversationHistory: ChatMessage[] = [];
    private isInterviewActive = false;
    private lastSubmissionCheck: number | null = null;
    private currentProblemSlug: string | null = null;
    private hasAcceptedSubmission: boolean = false;
    private isRecording: boolean = false;
    public isTyping: boolean = false;
    public currentTranscript: string = '';
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];
    private voiceEnabled: boolean = true;
    public voiceSpeed: number = 1.0;
    private currentAudio: HTMLAudioElement | null = null;

    // Speed change handler
    public setVoiceSpeed(speed: number) {
        this.voiceSpeed = speed;
        if (this.voiceService) {
            this.voiceService.setSpeechRate(speed);
        }
        console.log(`🎵 STANDALONE REACT: Voice speed set to ${speed}x`);
        this.showNotification(`Voice speed: ${speed}x`, 'info');
    }
    private lastTranscriptionTime: number = 0;
    private transcriptionCooldown: number = 2000;
    private root: any = null;
    private container: HTMLElement | null = null;
  private voiceService: VoiceService | null = null;
  private realtimeService: RealtimeVoiceService | null = null;
  private chatGPTService: ChatGPTService | null = null;
  private usageTotals = { prompt: 0, completion: 0, total: 0, costUsd: 0, model: '' };
  private isVoiceEnabled: boolean = false;
  private apiKey: string = '';
    private useRealtime: boolean = false; // Disable realtime by default

    constructor() {
        console.log('🚀 STANDALONE REACT: StandaloneAIInterviewer constructor called');
        this.initializeVoiceServices();
        this.init();
    }

  private async initializeVoiceServices() {
        try {
            console.log('🎤 Initializing voice services...');

            // Check if we're in a Chrome extension context
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // Get configuration from storage
                const configResponse = await chrome.runtime.sendMessage({ type: 'GET_CONFIG' });
                if (configResponse.success && configResponse.data) {
                    this.apiKey = configResponse.data.apiKey || '';
                    this.isVoiceEnabled = configResponse.data.voice?.enabled && configResponse.data.speechRecognition?.enabled;

                    if (this.apiKey) {
                        // Initialize all services
                        this.voiceService = new VoiceService();
                        this.realtimeService = new RealtimeVoiceService();
                        const model = configResponse.data.model || 'gpt-4o';
                        this.chatGPTService = new ChatGPTService(this.apiKey, model);
                        this.usageTotals.model = model;

                        // Configure voice service
                        this.voiceService.setApiKey(this.apiKey);
                        this.voiceService.setUseOpenAIVoice(true);
                        this.voiceService.setUseOpenAIWhisper(true);

                        // Configure realtime service
                        this.realtimeService.setApiKey(this.apiKey);
                        if (configResponse.data.realtimeProxyUrl) {
                            this.realtimeService.setProxyUrl(configResponse.data.realtimeProxyUrl);
                        }

                        // Set up event handlers
                        this.setupVoiceEventHandlers();
                        this.setupRealtimeEventHandlers();
                        this.setupWindowBridge();

                        console.log('✅ All services initialized successfully');
                    } else {
                        console.warn('⚠️ No API key found - AI features disabled');
                    }
                }
            } else {
                console.log('ℹ️ Not in Chrome extension context - voice services disabled');
            }
        } catch (error) {
            console.error('❌ Failed to initialize voice services:', error);
        }
    }

    // Bridge page -> content script for quick testing from page console
    private setupWindowBridge() {
        try {
            window.addEventListener('message', (event) => {
                const data = (event as MessageEvent<any>).data;
                if (!data || typeof data !== 'object') return;
                if (data.type === 'LEETMENTOR_RT_TEST') {
                    const text = typeof data.text === 'string' ? data.text : 'hello from bridge';
                    console.log('🔧 Realtime bridge: sending test text:', text);
                    if (this.realtimeService) {
                        try { this.realtimeService.sendTextMessage(text); } catch (e) { console.error('Bridge send failed:', e); }
                    }
                }
            });
            console.log('🔧 Realtime bridge initialized (window.postMessage)');
        } catch (e) {
            console.warn('Bridge init failed:', e);
        }
    }

  private setupVoiceEventHandlers() {
    if (!this.voiceService) return;

    // Speech recognition events
    this.voiceService.onSpeechResultReceived((text, isFinal) => {
      console.log('🎤 Speech result:', text, 'Final:', isFinal);
      if (isFinal && text.trim()) {
        this.currentTranscript = '';
        this.forceUpdate();
        this.handleUserMessage(text.trim());
      } else {
        this.currentTranscript = text;
        this.forceUpdate();
      }
    });

    this.voiceService.onSpeechStarted(() => {
      console.log('🎤 Speech started');
    });

    this.voiceService.onSpeechEnded(() => {
      console.log('🎤 Speech ended');
      this.currentTranscript = '';
      this.forceUpdate();
    });

    this.voiceService.onSpeechErrorOccurred((error) => {
      console.error('🎤 Speech error:', error);
      this.showNotification(`Voice error: ${error}`, 'error');
    });

    // Text-to-speech events
    this.voiceService.onSpeakStarted(() => {
      console.log('🔊 AI started speaking');
      this.isTyping = true;
      this.forceUpdate();
    });

    this.voiceService.onSpeakEnded(() => {
      console.log('🔊 AI finished speaking');
      this.isTyping = false;
      this.forceUpdate();
    });
  }

  private setupRealtimeEventHandlers() {
    if (!this.realtimeService) return;

    // Realtime streaming events
    this.realtimeService.setEventHandlers({
      onSpeechResult: (text, isFinal) => {
        console.log('🎤 Realtime transcript:', text, 'final:', isFinal);
        if (isFinal && text.trim()) {
          this.currentTranscript = '';
          this.forceUpdate();
          this.handleUserMessage(text.trim());
        } else {
          this.currentTranscript = text;
          this.forceUpdate();
        }
      },
      onSpeechStart: () => {
        console.log('🎤 Realtime listening started');
      },
      onSpeechEnd: () => {
        console.log('🎤 Realtime listening ended');
        this.currentTranscript = '';
        this.forceUpdate();
      },
      onSpeakStart: () => {
        console.log('🔊 Realtime AI speaking');
        this.isTyping = true;
        this.forceUpdate();
      },
      onSpeakEnd: () => {
        console.log('🔊 Realtime AI finished');
        this.isTyping = false;
        this.forceUpdate();
      },
      onSpeechError: (error) => {
        console.error('🎤 Realtime error:', error);
        this.showNotification(`Realtime error: ${error}`, 'error');
      }
    });
  }

    private async init() {
        console.log('🚀 STANDALONE REACT: Initializing...');

        // Wait for page to load
        if (document.readyState !== 'complete') {
            console.log('🚀 STANDALONE REACT: Document not ready, waiting for load event');
            window.addEventListener('load', () => {
                console.log('🚀 STANDALONE REACT: Load event fired');
                this.start();
            });
        } else {
            console.log('🚀 STANDALONE REACT: Document ready, starting immediately');
            this.start();
        }

        // Handle navigation changes (LeetCode is SPA)
        this.setupNavigationWatcher();
    }

    public getVoiceMode(): 'traditional' | 'realtime' {
        return this.useRealtime ? 'realtime' : 'traditional';
    }

    public toggleVoiceMode() {
        this.useRealtime = !this.useRealtime;
        this.showNotification(this.useRealtime ? 'Realtime voice enabled' : 'Traditional voice enabled', 'info');
        try {
            this.stopVoiceInput();
            this.skipVoiceResponse();
        } catch {}
        this.forceUpdate();
    }

    private start() {
        console.log('🚀 STANDALONE REACT: Start method called');

        // Check if we're in test mode
        const isTestMode = window.location.href.includes('react-test.html');

        if (isTestMode) {
            console.log('🧪 TEST MODE: Bypassing LeetCode detection, injecting test interface...');
            this.injectTestInterface();
        } else if (this.isLeetCodeProblemPage()) {
            console.log('✅ STANDALONE REACT: Detected LeetCode problem page');
            setTimeout(() => {
                console.log('🚀 STANDALONE REACT: Timeout fired, detecting problem...');
                this.detectProblem();
            }, 1000);
        } else {
            console.log('❌ STANDALONE REACT: Not a LeetCode problem page');
        }
    }

    private injectTestInterface() {
        console.log('🧪 TEST MODE: Creating test problem and injecting interface...');

        // Create a test problem (Two Sum)
        const testProblem: Problem = {
            id: 'two-sum',
            title: 'Two Sum',
            titleSlug: 'two-sum',
            difficulty: 'Easy',
            description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
            url: 'https://leetcode.com/problems/two-sum/'
        };

        console.log('🧪 TEST MODE: Using test problem:', testProblem.title);

        // Inject the interface with the test problem
        this.injectInterviewInterface(testProblem);
    }

    private isLeetCodeProblemPage(): boolean {
        // Check if we're on a LeetCode problem page (but not submissions)
        const isLeetCode = window.location.href.includes('leetcode.com/problems/') &&
            !window.location.href.includes('/submissions/');
        console.log('🚀 STANDALONE REACT: isLeetCodeProblemPage check:', isLeetCode);
        return isLeetCode;
    }

    private isSameProblem(newUrl: string): boolean {
        // Extract problem slug from URLs to check if it's the same problem
        const currentMatch = window.location.href.match(/leetcode\.com\/problems\/([^/?]+)/);
        const newMatch = newUrl.match(/leetcode\.com\/problems\/([^/?]+)/);

        if (!currentMatch || !newMatch) return false;

        const currentSlug = currentMatch[1];
        const newSlug = newMatch[1];

        console.log('🚀 STANDALONE REACT: Problem comparison - Current:', currentSlug, 'New:', newSlug);
        return currentSlug === newSlug;
    }

    private setupNavigationWatcher() {
        console.log('🚀 STANDALONE REACT: Setting up navigation watcher');

        let currentUrl = window.location.href;
        this.currentProblemSlug = this.extractProblemSlug(currentUrl);

        console.log('🚀 STANDALONE REACT: Initial URL:', currentUrl);
        console.log('🚀 STANDALONE REACT: Initial problem slug:', this.currentProblemSlug);

        const checkForNavigation = () => {
            if (window.location.href !== currentUrl) {
                const newUrl = window.location.href;
                const newProblemSlug = this.extractProblemSlug(newUrl);

                console.log('🔄 STANDALONE REACT: Navigation detected!');
                console.log('🔄 STANDALONE REACT: Old URL:', currentUrl);
                console.log('🔄 STANDALONE REACT: New URL:', newUrl);
                console.log('🔄 STANDALONE REACT: Old slug:', this.currentProblemSlug);
                console.log('🔄 STANDALONE REACT: New slug:', newProblemSlug);

                // Only reset if it's actually a different problem
                if (this.currentProblemSlug !== newProblemSlug &&
                    newProblemSlug !== null &&
                    this.currentProblemSlug !== null &&
                    this.isInjected) {
                    console.log('🔄 STANDALONE REACT: Different problem detected, resetting...');
                    this.reset();
                    this.currentProblemSlug = newProblemSlug;
                    if (this.isLeetCodeProblemPage()) {
                        setTimeout(() => {
                            this.detectProblem();
                        }, 1500);
                    }
                } else if (this.currentProblemSlug === newProblemSlug && newProblemSlug !== null) {
                    console.log('🔄 STANDALONE REACT: Same problem, different section - NO RESET');
                } else if (newProblemSlug === null) {
                    console.log('🔄 STANDALONE REACT: Not a LeetCode problem page - NO RESET');
                } else if (!this.isInjected && newProblemSlug !== null && this.isLeetCodeProblemPage()) {
                    console.log('🔄 STANDALONE REACT: No interface yet, detecting problem...');
                    this.currentProblemSlug = newProblemSlug;
                    setTimeout(() => {
                        this.detectProblem();
                    }, 1000);
                } else {
                    console.log('🔄 STANDALONE REACT: Other navigation scenario - NO RESET');
                }

                // Always update the current URL
                currentUrl = newUrl;

                // Update the problem slug if we're on a valid problem page
                if (newProblemSlug !== null) {
                    this.currentProblemSlug = newProblemSlug;
                }
            }
        };

        setInterval(checkForNavigation, 1000);

        window.addEventListener('popstate', () => {
            console.log('🔄 STANDALONE REACT: Popstate event');
            setTimeout(checkForNavigation, 100);
        });
    }

    private extractProblemSlug(url: string): string | null {
        const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
        return match ? match[1] : null;
    }

    private reset() {
        console.log('🚀 STANDALONE REACT: Resetting state');
        this.isInjected = false;
        this.isInterviewActive = false;
        this.currentPhase = 'problem-understanding';
        this.conversationHistory = [];
        this.hasAcceptedSubmission = false;

        // Remove React root
        if (this.root && this.container) {
            this.root.unmount();
            this.root = null;
        }

        const existingInterface = document.getElementById('leetmentor-standalone');
        if (existingInterface) {
            existingInterface.remove();
        }
        this.container = null;
    }

    private async detectProblem() {
        try {
            console.log('🔍 STANDALONE REACT: Detecting problem...');

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
                console.log('✅ STANDALONE REACT: Title element found:', titleElement.textContent);
                const problem = await this.extractProblemData(titleElement);
                if (problem) {
                    console.log('✅ STANDALONE REACT: Problem detected:', problem.title);
                    this.injectInterviewInterface(problem);
                } else {
                    console.log('❌ STANDALONE REACT: Could not extract problem data');
                    // Still try to inject interface without problem data
                    this.injectInterviewInterface();
                }
            } else {
                console.log('❌ STANDALONE REACT: No title element found after trying all selectors');
                // Try to inject interface anyway
                this.injectInterviewInterface();
            }
        } catch (error) {
            console.error('❌ STANDALONE REACT: Error detecting problem:', error);
        }
    }

    private waitForAnyElement(selectors: string[], timeout = 15000): Promise<Element | null> {
        console.log('🚀 STANDALONE REACT: Waiting for any element from:', selectors);
        return new Promise((resolve) => {
            // Check immediately
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    console.log('✅ STANDALONE REACT: Element found immediately with selector:', selector);
                    resolve(element);
                    return;
                }
            }

            // Set up observer
            const observer = new MutationObserver(() => {
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        console.log('✅ STANDALONE REACT: Element found via observer with selector:', selector);
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
                console.log('⏰ STANDALONE REACT: Element wait timeout after trying:', selectors);
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    private async extractProblemData(titleElement?: Element): Promise<Problem | null> {
        console.log('🚀 STANDALONE REACT: Extracting problem data...');

        const url = window.location.href;
        const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);

        if (!match) {
            console.log('❌ STANDALONE REACT: URL does not match LeetCode pattern');
            return null;
        }

        const titleSlug = match[1];
        console.log('🚀 STANDALONE REACT: Title slug:', titleSlug);

        // Use provided title element or find one
        let title = '';
        if (titleElement) {
            title = titleElement.textContent?.trim() || '';
            console.log('🚀 STANDALONE REACT: Using provided title element:', title);
        } else {
            // Try to find title element
            const foundTitleElement = document.querySelector('[data-cy="question-title"]') ||
                document.querySelector('.css-v3d350') ||
                document.querySelector('h1') ||
                document.querySelector('[class*="title"]');

            if (foundTitleElement) {
                title = foundTitleElement.textContent?.trim() || '';
                console.log('🚀 STANDALONE REACT: Found title element:', title);
            } else {
                console.log('❌ STANDALONE REACT: No title element found');
                return null;
            }
        }

        // Extract difficulty from the page
        const difficulty = this.detectDifficulty();
        console.log('🚀 STANDALONE REACT: Detected difficulty:', difficulty);

        return {
            id: titleSlug,
            title,
            titleSlug,
            difficulty: difficulty as 'Easy' | 'Medium' | 'Hard',
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
                console.log('🔍 STANDALONE REACT: Found difficulty element:', selector, 'text:', text);

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
                console.log('🔍 STANDALONE REACT: Found Easy difficulty via class/text');
                return 'Easy';
            }
            if ((className.includes('medium') || text === 'medium') && text.length < 10) {
                console.log('🔍 STANDALONE REACT: Found Medium difficulty via class/text');
                return 'Medium';
            }
            if ((className.includes('hard') || text === 'hard') && text.length < 10) {
                console.log('🔍 STANDALONE REACT: Found Hard difficulty via class/text');
                return 'Hard';
            }
        }

        console.log('⚠️ STANDALONE REACT: Could not detect difficulty, defaulting to Medium');
        return 'Medium';
    }

    private injectInterviewInterface(problem?: Problem) {
        console.log('💉 STANDALONE REACT: Injecting interview interface...');

        // Set the current problem
        this.currentProblem = problem || null;
        console.log('📝 Current problem set to:', this.currentProblem);

        // Check if we're in test mode
        const isTestMode = window.location.href.includes('react-test.html');

        let container: Element;

        if (isTestMode) {
            // In test mode, use the react-root element
            container = document.getElementById('react-root');
            if (!container) {
                console.error('❌ TEST MODE: Could not find #react-root element');
                return;
            }
            console.log('✅ TEST MODE: Found react-root container');
        } else {
            // Normal content script mode
            // Find injection target
            const injectionTarget = this.findInjectionTarget();
            if (!injectionTarget) {
                console.log('❌ STANDALONE REACT: Could not find injection target');
                return;
            }
            container = injectionTarget;
            console.log('✅ STANDALONE REACT: Found injection container:', container);
        }

        // Remove existing
        const existing = document.getElementById('leetmentor-standalone');
        if (existing) {
            existing.remove();
        }

        // Create container for React
        this.container = document.createElement('div');
        this.container.id = 'leetmentor-standalone';

        if (isTestMode) {
            // In test mode, replace the content
            container.innerHTML = '';
            container.appendChild(this.container);
        } else {
            // Normal mode, insert at beginning
            container.insertBefore(this.container, container.firstChild);
        }

        // Create React root and render
        try {
            console.log('🔧 Creating React root...');
            this.root = createRoot(this.container);
            console.log('🔧 React root created, rendering component...');

            const componentProps = {
                problem,
                interviewer: this
            };
            console.log('🔧 Component props:', componentProps);

            this.root.render(
                React.createElement(StandaloneInterfaceReactWrapper, componentProps)
            );
            console.log('✅ STANDALONE REACT: React root created and rendered successfully');
        } catch (error) {
            console.error('❌ STANDALONE REACT: React injection failed, trying fallback:', error);
            console.error('Error details:', error.stack);
            this.injectFallbackUI(problem);
            return;
        }

        // Add entrance animation
        this.container.style.opacity = '0';
        this.container.style.transform = 'translateY(20px) scale(0.95)';

        setTimeout(() => {
            this.container!.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            this.container!.style.opacity = '1';
            this.container!.style.transform = 'translateY(0) scale(1)';
        }, 100);

        this.isInjected = true;

        console.log('✅ STANDALONE REACT: Interview interface injected successfully!');
    }

    private injectFallbackUI(problem?: Problem) {
        console.log('🔄 STANDALONE REACT: Injecting fallback vanilla UI...');

        if (!this.container) {
            console.error('❌ FALLBACK: No container available');
            return;
        }

        // Create a simple vanilla JS interface
        this.container.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1));
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 24px;
                padding: 24px;
                margin: 16px 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            ">
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 20px;
                ">
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
                        border-radius: 16px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                    ">🎯</div>
                    <div>
                        <h3 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937;">LeetMentor</h3>
                        <p style="margin: 0; color: #6b7280; font-weight: 500;">AI Interview Assistant</p>
                    </div>
                    <div style="
                        margin-left: auto;
                        padding: 8px 16px;
                        background: rgba(34, 197, 94, 0.2);
                        border: 1px solid rgba(34, 197, 94, 0.3);
                        border-radius: 20px;
                        color: #059669;
                        font-weight: 600;
                        font-size: 14px;
                    ">ACTIVE</div>
                </div>
                
                ${problem ? `
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 20px;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h4 style="margin: 0; font-size: 20px; font-weight: 600; color: #1f2937;">${problem.title}</h4>
                        <span style="
                            padding: 6px 12px;
                            background: linear-gradient(135deg, #f59e0b, #d97706);
                            color: white;
                            border-radius: 12px;
                            font-weight: 600;
                            font-size: 12px;
                            text-transform: uppercase;
                        ">${problem.difficulty}</span>
                    </div>
                    <div style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">LeetCode Problem</div>
                    <div style="display: flex; gap: 16px; font-size: 14px; color: #6b7280;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span>📊</span>
                            <span style="font-weight: 500;">Interview Practice</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <span>⏱️</span>
                            <span style="font-weight: 500;">Ready to start</span>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <div style="
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    padding: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <h4 style="margin: 0 0 8px 0; color: #f59e0b; font-weight: 600;">React UI Blocked</h4>
                    <p style="margin: 0 0 16px 0; color: #6b7280; line-height: 1.5;">
                        The advanced UI is blocked by this page's security policy. 
                        <br>Try refreshing the page or check the browser console for more details.
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 14px;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        🔄 Refresh Page
                    </button>
                </div>
            </div>
        `;

        // Add to page
        this.container.style.opacity = '0';
        this.container.style.transform = 'translateY(20px)';

        // Animate in
        setTimeout(() => {
            this.container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            this.container.style.opacity = '1';
            this.container.style.transform = 'translateY(0)';
        }, 100);

        console.log('✅ FALLBACK: Vanilla UI injected successfully');
    }

    private findInjectionTarget(): Element | null {
        console.log('🔍 STANDALONE REACT: Finding injection target...');

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
                console.log(`✅ STANDALONE REACT: Found element with selector: ${selector}`, element);
                console.log(`   Element tag: ${element.tagName}, classes: ${element.className}, id: ${element.id}`);
                return element;
            } else {
                console.log(`❌ STANDALONE REACT: Selector not found: ${selector}`);
            }
        }

        // Fallback to body if no specific target found
        console.log('⚠️ STANDALONE REACT: No specific injection target found, using body');
        return document.body;
    }

    // Public methods for the React wrapper
    public startInterview() {
        console.log('🚀 STANDALONE REACT: Starting interview...');
        this.isInterviewActive = true;

        // Create problem-specific welcome message
        let welcomeContent: string = INTERVIEW_PROMPTS.WELCOME_MESSAGE;

        if (this.currentProblem && this.currentProblem.title !== 'No Problem Selected') {
            welcomeContent = INTERVIEW_PROMPTS.WELCOME_MESSAGE
                .replace('{difficulty}', this.currentProblem.difficulty.toLowerCase())
                .replace('{title}', this.currentProblem.title);
        }

        // Add welcome message
        const welcomeMessage: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: welcomeContent,
            timestamp: new Date()
        };

        this.conversationHistory.push(welcomeMessage);

        // Force re-render
        this.forceUpdate();
    }

    public handleUserMessage(message: string) {
        console.log('💬 STANDALONE REACT: Handling user message:', message);

        // Add user message to UI
        const userMessage: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };

        this.conversationHistory.push(userMessage);

        // Force re-render to show typing indicator
        this.forceUpdate();

        // Get AI response
        this.getAIResponse(message).then(async aiResponse => {
            const aiMessage: ChatMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date()
            };

            // Add message to UI first
            this.conversationHistory.push(aiMessage);
            this.forceUpdate();

            // Then speak the response (if voice is enabled)
            if (this.isVoiceEnabled) {
                try {
                    if (this.useRealtime && this.realtimeService) {
                        // Stream via Realtime API (audio will play as it streams)
                        this.realtimeService.sendTextMessage(aiResponse);
                    } else if (this.voiceService) {
                        const voiceSettings = {
                            enabled: true,
                            language: 'en-US',
                            rate: 1.0,
                            pitch: 1.0,
                            volume: 1.0
                        };
                        await this.voiceService.speak(aiResponse, voiceSettings);
                    }
                } catch (error) {
                    console.error('🔊 Failed to speak AI response:', error);
                }
            }
        }).catch(error => {
            console.error('❌ STANDALONE REACT: Error getting AI response:', error);
            const errorMessage: ChatMessage = {
                id: this.generateId(),
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date()
            };
            this.conversationHistory.push(errorMessage);
            this.forceUpdate();
        });
    }

    public clearChat() {
        this.conversationHistory = [];
        this.forceUpdate();
    }

    public exportChat() {
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

    public showSettings() {
        this.showNotification('Settings panel coming soon!', 'info');
    }

    public async startVoiceInput() {
        if (!this.isVoiceEnabled) {
            throw new Error('Voice not enabled');
        }

        const speechSettings = {
            enabled: true,
            language: 'en-US',
            continuous: false,
            interimResults: true
        };

        try {
            if (this.useRealtime && this.realtimeService) {
                if (!this.realtimeService.getIsConnected()) {
                    await this.realtimeService.connect();
                }
                await this.realtimeService.startListening(speechSettings);
            } else if (this.voiceService) {
                await this.voiceService.startListening(speechSettings);
            } else {
                throw new Error('No voice service available');
            }
            console.log('🎤 Voice input started successfully');
        } catch (error) {
            console.error('🎤 Failed to start voice input:', error);
            throw error;
        }
    }

    public stopVoiceInput() {
        if (this.useRealtime && this.realtimeService) {
            this.realtimeService.stopListening();
        } else if (this.voiceService) {
            this.voiceService.stopListening();
        }
        console.log('🎤 Voice input stopped');
    }

    public skipVoiceResponse() {
        console.log('⏭️ STANDALONE REACT: Skipping voice response...');
        if (this.useRealtime && this.realtimeService) {
            this.realtimeService.stopSpeaking();
        } else if (this.voiceService) {
            this.voiceService.stopSpeaking();
        }
        // Note: Typing animation is managed by React component state, not class property
        this.forceUpdate();
    }

    private generateId(): string {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public forceUpdate() {
        if (this.root && this.container) {
            this.root.render(
                React.createElement(StandaloneInterfaceReactWrapper, {
                    problem: this.currentProblem,
                    interviewer: this,
                    messages: this.conversationHistory,
                    isInterviewActive: this.isInterviewActive
                })
            );
        }
    }

    private currentProblem: Problem | null = null;

    private async getAIResponse(userMessage: string): Promise<string> {
        if (!this.chatGPTService) {
            throw new Error('ChatGPT service not initialized');
        }

        try {
            console.log('🤖 Getting AI response for:', userMessage);

            // Build conversation history for API (convert from ChatMessage to ChatGPTMessage)
            const apiHistory: ChatGPTMessage[] = this.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Get AI response using real ChatGPT
            const aiResponse = await this.chatGPTService.generateInterviewResponse(
                this.currentProblem || {
                    title: 'Algorithm Interview',
                    difficulty: 'Medium',
                    description: 'Technical interview practice'
                } as any,
                apiHistory,
                userMessage
            );

            // Update usage totals if available
            if (this.chatGPTService && this.chatGPTService.lastUsage) {
                const t = this.chatGPTService.totals;
                this.usageTotals.prompt = t.prompt;
                this.usageTotals.completion = t.completion;
                this.usageTotals.total = t.total;
                this.usageTotals.costUsd = t.costUsd;
                this.forceUpdate();
            }

            console.log('🤖 AI Response:', aiResponse);
            return aiResponse;

        } catch (error) {
            console.error('❌ Failed to get AI response:', error);
            // Fallback response
            return "I apologize, but I'm having trouble generating a response right now. Could you please rephrase your question or try again?";
        }
    }

    public showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
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

    // ... rest of the methods (setupSubmissionMonitor, etc.) would go here
}

// React wrapper component
interface StandaloneInterfaceReactWrapperProps {
    problem?: Problem;
    interviewer: StandaloneReactInterviewer;
    messages?: ChatMessage[];
    isInterviewActive?: boolean;
}

const StandaloneInterfaceReactWrapper: React.FC<StandaloneInterfaceReactWrapperProps> = ({
    problem,
    interviewer,
    messages = [],
    isInterviewActive = false
}) => {
    console.log('🔧 StandaloneInterfaceReactWrapper called with:', { problem, interviewer, messages, isInterviewActive });

    // Use the interviewer's isTyping state instead of local state
    const isTyping = interviewer.isTyping || false;
    const [isListening, setIsListening] = useState(false);
    const currentTranscript = interviewer.currentTranscript;
    const voiceMode = interviewer.getVoiceMode();

    const handleSendMessage = useCallback((message: string) => {
        interviewer.isTyping = true;
        interviewer.forceUpdate();
        interviewer.handleUserMessage(message);
        // Note: isTyping will be set to false by voice service callbacks when speaking starts
    }, [interviewer]);

    const handleStartInterview = useCallback(() => {
        interviewer.startInterview();
    }, [interviewer]);

    const handleSettingsClick = useCallback(() => {
        interviewer.showSettings();
    }, [interviewer]);

    const handleClearChat = useCallback(() => {
        interviewer.clearChat();
    }, [interviewer]);

    const handleExportChat = useCallback(() => {
        interviewer.exportChat();
    }, [interviewer]);

    const handleStartVoiceInput = useCallback(async () => {
        console.log('🎤 Starting voice input...');
        setIsListening(true);

        try {
            await interviewer.startVoiceInput();
            interviewer.showNotification('Voice input started!', 'success');
        } catch (error) {
            console.error('Voice input failed:', error);
            setIsListening(false);
            interviewer.showNotification('Voice input failed', 'error');
        }
    }, [interviewer]);

    const handleStopVoiceInput = useCallback(() => {
        console.log('🎤 Stopping voice input...');
        setIsListening(false);
        interviewer.stopVoiceInput();
        interviewer.showNotification('Voice input stopped', 'info');
    }, [interviewer]);

    const handleSkipVoice = useCallback(() => {
        console.log('⏭️ Skipping voice response...');
        interviewer.isTyping = false;
        interviewer.forceUpdate();
        interviewer.skipVoiceResponse();
        interviewer.showNotification('Voice response skipped', 'info');
    }, [interviewer]);

    const handleSpeedChange = useCallback((speed: number) => {
        console.log(`🎵 Speed change requested: ${speed}x`);
        interviewer.setVoiceSpeed(speed);
    }, [interviewer]);

    const handleToggleVoiceMode = useCallback(() => {
        interviewer.toggleVoiceMode();
    }, [interviewer]);

    return (
        <StandaloneInterface
            problem={problem}
            onSendMessage={handleSendMessage}
            onStartInterview={handleStartInterview}
            onSettingsClick={handleSettingsClick}
            onClearChat={handleClearChat}
            onExportChat={handleExportChat}
            onStartVoiceInput={handleStartVoiceInput}
            onStopVoiceInput={handleStopVoiceInput}
            onSkipVoice={handleSkipVoice}
            onSpeedChange={handleSpeedChange}
            currentSpeed={interviewer.voiceSpeed}
            messages={messages}
            isInterviewActive={isInterviewActive}
            isTyping={isTyping}
            isListening={isListening}
            currentTranscript={currentTranscript}
            voiceMode={voiceMode}
            usageTotals={(interviewer as any).usageTotals}
        />
    );
};

// Check if we're in test mode (react-test.html)
const isTestMode = window.location.href.includes('react-test.html');

console.log('🔍 STANDALONE SCRIPT INITIALIZATION:');
console.log('Current URL:', window.location.href);
console.log('Is test mode:', isTestMode);
console.log('Existing leetmentorStandaloneReact:', !!(window as any).leetmentorStandaloneReact);
console.log('Existing leetmentorTestInstance:', !!(window as any).leetmentorTestInstance);

try {
    if (isTestMode) {
        console.log('🧪 TEST MODE: Initializing React components for testing...');

        // Create test instance
        const testInterviewer = new StandaloneReactInterviewer();
        console.log('✅ StandaloneReactInterviewer created successfully');

        // Export for the test interface
        (window as any).leetmentorTestInstance = testInterviewer;
        console.log('✅ Test instance exported to window');

        console.log('✅ TEST MODE: React components loaded successfully!');

    } else if (!(window as any).leetmentorStandaloneReact) {
        console.log('🚀 STANDALONE REACT: About to create StandaloneReactInterviewer instance...');
        const standaloneInterviewer = new StandaloneReactInterviewer();
        console.log('✅ StandaloneReactInterviewer created successfully');

        // Export for debugging
        (window as any).leetmentorStandaloneReact = standaloneInterviewer;
        console.log('✅ Instance exported to window');

        console.log('✅ STANDALONE REACT: Content script loaded successfully!');
    } else {
        console.log('⚠️ STANDALONE REACT: Instance already exists, skipping initialization');
    }
} catch (error) {
    console.error('❌ FATAL ERROR during initialization:', error);
    console.error('Error stack:', error.stack);

    // Try to provide more details about the error
    if (error instanceof ReferenceError) {
        console.error('ReferenceError - Check if all dependencies are loaded');
    } else if (error instanceof TypeError) {
        console.error('TypeError - Check method calls and property access');
    } else {
        console.error('Unknown error type:', error.constructor.name);
    }
}

// Export to global scope for testing
(window as any).StandaloneReactInterviewer = StandaloneReactInterviewer;

console.log('✅ STANDALONE REACT: Class exported to global scope');
console.log('StandaloneReactInterviewer available on window:', !!(window as any).StandaloneReactInterviewer);
