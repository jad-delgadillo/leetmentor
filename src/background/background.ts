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

    // Add webNavigation listener for SPA navigation
    chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
      console.log('🔄 Background: History state updated:', details.url);

      // Only handle main frame navigation
      if (details.frameId !== 0) return;

      // Only handle LeetCode domains
      if (!/https:\/\/leetcode\.(com|cn)\//.test(details.url)) return;

      // Notify existing content script instead of reinjecting (avoid duplicates)
      try {
        await chrome.tabs.sendMessage(details.tabId, {
          type: 'NAVIGATION_DETECTED',
          data: { url: details.url }
        });
        console.log('✅ Background: Notified content script of SPA navigation');
      } catch (e) {
        console.warn('⚠️ Background: Could not notify content script (it may not be ready yet)');
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
      practiceAreas: ['algorithms', 'data-structures'],
      // Optional public WSS endpoint to your local proxy (e.g., ngrok/cloudflared)
      // Example: wss://<your-subdomain>.trycloudflare.com
      realtimeProxyUrl: 'wss://d7ab8798f4f9.ngrok-free.app/'
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

        case 'HANDLE_EMBEDDED_MESSAGE':
          const chatResponse = await this.handleEmbeddedMessage(message.data);
          sendResponse({ success: true, data: chatResponse });
          break;

        case 'HANDLE_SUBMISSION_RESULT':
          const submissionFeedback = await this.handleSubmissionResult(message.data);
          sendResponse({ success: true, data: submissionFeedback });
          break;

        case 'GET_AI_RESPONSE':
          this.handleAIResponse(message.data, sendResponse);
          break;
        
        case 'TRANSCRIBE_AUDIO':
          this.handleAudioTranscription(message.data, sendResponse);
          break;
        
        case 'SYNTHESIZE_SPEECH':
          this.handleSpeechSynthesis(message.data, sendResponse);
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

  private async handleEmbeddedMessage(data: any): Promise<{ response: string }> {
    const { problem, message, config, conversationHistory = [], interviewPhase = 'problem-understanding' } = data;

    if (!config || !config.apiKey) {
      // Try to get config from storage if not provided
      const configResponse = await this.getConfig();
      if (!configResponse || !configResponse.apiKey) {
        throw new Error('API key not configured. Please configure your OpenAI API key in the extension popup.');
      }
      data.config = configResponse;
    }

    try {
      // Concise prompt + last-N history window
      const conciseSystem = `You are a technical interviewer. Keep answers 1–2 sentences. Ask questions, avoid lecturing. Do not restate the problem. Focus on thought process, complexity, trade‑offs.`;
      const minimalProblem = `Problem: ${problem?.title || 'Unknown'} (${problem?.difficulty || 'Unknown'}). Phase: ${interviewPhase}`;
      const lastN = (conversationHistory || []).slice(-8);
      const messages = [
        { role: 'system', content: conciseSystem },
        { role: 'system', content: minimalProblem },
        ...lastN,
        { role: 'user', content: message }
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: data.config.model || 'gpt-4o',
          messages: messages,
          max_tokens: 200,
          temperature: 0.7,
          presence_penalty: 0.1,
          frequency_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        console.error('Unexpected API response structure:', result);
        throw new Error('Unexpected response from OpenAI API');
      }

      const aiResponse = result.choices[0].message.content || 'I apologize, but I encountered an error processing your message. Please try again.';

      return { response: aiResponse };
    } catch (error) {
      console.error('Error handling embedded message:', error);
      
      // Provide helpful fallback responses
      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('Please configure your OpenAI API key in the extension popup to enable the AI interviewer.');
      }
      
      throw error;
    }
  }

  private buildInterviewerPrompt(problem: any, phase: string): string {
    const basePrompt = `You are an experienced technical interviewer conducting a coding interview. Your goal is to evaluate the candidate's problem-solving skills, communication, and coding ability.

Current Problem:
Title: ${problem?.title || 'Unknown'}
Difficulty: ${problem?.difficulty || 'Unknown'}
Description: ${problem?.description ? problem.description.substring(0, 300) + '...' : 'N/A'}

CURRENT INTERVIEW PHASE: ${phase.toUpperCase().replace('-', ' ')}`;

    const phaseInstructions = {
      'problem-understanding': `
PHASE: PROBLEM UNDERSTANDING
Your current focus:
- Have them explain the problem in their own words
- Ask clarifying questions about input/output format
- Discuss edge cases and constraints
- Confirm they understand what's being asked
- DO NOT discuss algorithms or approaches yet
- Keep responses short and focused on understanding`,

      'approach-discussion': `
PHASE: APPROACH DISCUSSION
Your current focus:
- Ask them to think of different approaches
- Discuss trade-offs between approaches
- Guide them to the optimal approach through questions
- Ask about time and space complexity for each approach
- DO NOT ask for implementation details yet
- Focus on high-level strategy`,

      'complexity-analysis': `
PHASE: COMPLEXITY ANALYSIS
Your current focus:
- Confirm time complexity: "What's the time complexity of this approach?"
- Confirm space complexity: "What about space complexity?"
- Make sure they can explain WHY it has that complexity
- Discuss if there are better complexity options
- Prepare them for implementation`,

      'implementation': `
PHASE: IMPLEMENTATION
Your current focus:
- Guide them to use the LeetCode editor: "Great! Now let's implement this solution. Go ahead and code it in the LeetCode editor below."
- While they code, ask about edge cases
- Ask them to walk through their code
- NO pseudocode - they should write actual code in LeetCode
- Encourage them to test their solution`,

      'testing-review': `
PHASE: TESTING & REVIEW
Your current focus:
- Ask them to test with examples
- Discuss optimizations if any
- Ask about alternative approaches
- Provide constructive feedback
- Wrap up the interview positively`
    };

    const currentPhaseInstructions = phaseInstructions[phase as keyof typeof phaseInstructions] || phaseInstructions['problem-understanding'];

    return `${basePrompt}

${currentPhaseInstructions}

IMPORTANT RULES:
- Keep responses to 1-2 sentences max
- Be encouraging but maintain interview standards
- Guide through questions, don't lecture
- Focus on their thought process
- Be conversational and supportive

Remember: This is practice, so be constructive and educational while maintaining realistic interview standards.`;
  }

  private async handleSubmissionResult(data: any): Promise<{ feedback: string }> {
    const { problem, result, isAccepted, config } = data;

    if (!config || !config.apiKey) {
      throw new Error('API key not configured');
    }

    if (isAccepted) {
      return { feedback: "Excellent work! Your solution passed all test cases. Would you like to discuss the time and space complexity, or explore any optimizations?" };
    }

    try {
      // Get AI feedback on the submission result
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a technical interviewer helping a candidate debug their LeetCode submission. Provide constructive feedback and guidance.

Problem: ${problem?.title || 'Unknown'}
Difficulty: ${problem?.difficulty || 'Unknown'}`
            },
            {
              role: 'user',
              content: `My submission result was: "${result}". Can you help me understand what might have gone wrong and suggest what to check or improve?`
            }
          ],
          max_tokens: 400,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const apiResult = await response.json();
      const feedback = apiResult.choices[0]?.message?.content || 'Let me help you debug this. Can you share more details about your approach?';

      return { feedback };
    } catch (error) {
      console.error('Error handling submission result:', error);
      return { feedback: 'I encountered an error providing feedback. Let\'s try a different approach - can you walk me through your solution step by step?' };
    }
  }

  private async handleAIResponse(data: any, sendResponse: (response?: any) => void) {
    try {
      const { problem, conversationHistory, userMessage, hasAcceptedSubmission } = data;
      
      // Get the stored API key
      const config = await this.getConfig();
      
      if (!config.apiKey) {
        sendResponse({ 
          success: false, 
          error: 'OpenAI API key not configured. Please set it in the extension settings.' 
        });
        return;
      }

      // Keep prompts concise and use last-N window to reduce tokens
      const conciseSystem = {
        role: 'system',
        content: `You are a technical interviewer. Keep answers to 1–2 sentences, ask questions, avoid lecturing. Do not restate the problem. Focus on thought process, complexity, and trade‑offs.`
      } as const;

      const minimalProblem = {
        role: 'system',
        content: `Problem: ${problem.title} (${problem.difficulty}). Status: ${hasAcceptedSubmission ? 'ACCEPTED' : 'PENDING'}.`
      } as const;

      const lastN = (conversationHistory || []).slice(-8);
      const messages = [
        conciseSystem,
        minimalProblem,
        ...lastN,
        { role: 'user', content: userMessage }
      ];

      console.log('🤖 Background: Sending request to OpenAI API...');

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model || 'gpt-4o',
          messages: messages,
          max_tokens: 150, // concise for voice
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Background: OpenAI API error:', errorText);
        
        let errorMessage = 'Failed to get AI response';
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key in settings.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        }
        
        sendResponse({ success: false, error: errorMessage });
        return;
      }

      const apiResult = await response.json();
      const aiResponse = apiResult.choices[0]?.message?.content || 'I apologize, but I couldn\'t generate a response. Please try again.';

      console.log('✅ Background: Got AI response successfully');
      sendResponse({ success: true, data: aiResponse });

    } catch (error) {
      console.error('❌ Background: Error in handleAIResponse:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }

  private async handleAudioTranscription(data: any, sendResponse: (response?: any) => void) {
    try {
      const { audioData, mimeType } = data;
      
      // Get the stored API key
      const config = await this.getConfig();
      
      if (!config.apiKey) {
        sendResponse({ 
          success: false, 
          error: 'OpenAI API key not configured. Please set it in the extension settings.' 
        });
        return;
      }

      console.log('🎤 Background: Transcribing audio with Whisper...');

      // Convert base64 to blob
      const base64Response = await fetch(audioData);
      const audioBlob = await base64Response.blob();

      // Create FormData for Whisper API
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'en'); // Can be made configurable
      formData.append('response_format', 'json');

      // Call OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Background: Whisper API error:', errorText);
        
        let errorMessage = 'Failed to transcribe audio';
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key in settings.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        }
        
        sendResponse({ success: false, error: errorMessage });
        return;
      }

      const result = await response.json();
      const transcription = result.text || '';

      console.log('✅ Background: Audio transcribed successfully:', transcription);
      sendResponse({ success: true, data: { text: transcription } });

    } catch (error) {
      console.error('❌ Background: Error in handleAudioTranscription:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }

  private async handleSpeechSynthesis(data: any, sendResponse: (response?: any) => void) {
    try {
      const { text, voice = 'alloy', speed = 1.0 } = data;
      
      // Get the stored API key
      const config = await this.getConfig();
      
      if (!config.apiKey) {
        sendResponse({ 
          success: false, 
          error: 'OpenAI API key not configured. Please set it in the extension settings.' 
        });
        return;
      }

      console.log('🔊 Background: Synthesizing speech with OpenAI TTS...');

      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice, // alloy, echo, fable, onyx, nova, shimmer
          speed: speed,
          response_format: 'mp3'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Background: TTS API error:', errorText);
        
        let errorMessage = 'Failed to synthesize speech';
        if (response.status === 401) {
          errorMessage = 'Invalid API key. Please check your OpenAI API key in settings.';
        } else if (response.status === 429) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        }
        
        sendResponse({ success: false, error: errorMessage });
        return;
      }

      // Convert response to blob
      const audioBlob = await response.blob();
      
      // Convert blob to base64 for sending to content script
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        console.log('✅ Background: Speech synthesized successfully');
        sendResponse({ success: true, data: { audioData: base64Audio } });
      };
      reader.readAsDataURL(audioBlob);

    } catch (error) {
      console.error('❌ Background: Error in handleSpeechSynthesis:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      });
    }
  }
}

// Initialize the background service
new BackgroundService();
