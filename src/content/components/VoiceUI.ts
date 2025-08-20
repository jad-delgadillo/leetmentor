import { VoiceChat, VoiceMode } from './VoiceChat';

export interface VoiceUIConfig {
  onModeChange?: (mode: VoiceMode) => void;
  onToggleListening?: () => void;
  onStopSpeaking?: () => void;
}

/**
 * VoiceUI Component
 * 
 * Creates and manages the voice controls UI for the chat interface
 */
export class VoiceUI {
  private voiceChat: VoiceChat;
  private config: VoiceUIConfig;
  private container: HTMLElement | null = null;

  constructor(voiceChat: VoiceChat, config: VoiceUIConfig = {}) {
    this.voiceChat = voiceChat;
    this.config = config;
  }

  /**
   * Create and return the voice controls HTML element
   */
  createVoiceControls(): HTMLElement {
    const voiceControls = document.createElement('div');
    voiceControls.id = 'voice-controls';
    voiceControls.style.cssText = `
      border-top: 1px solid #e5e7eb;
      padding: 12px 20px;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    `;

    voiceControls.innerHTML = this.getVoiceControlsHTML();
    this.container = voiceControls;
    this.setupEventListeners();
    this.updateUI();

    return voiceControls;
  }

  /**
   * Update the UI based on current voice state
   */
  updateUI() {
    if (!this.container) return;

    const state = this.voiceChat.getState();
    
    // Update microphone button
    const micButton = this.container.querySelector('#mic-button') as HTMLButtonElement;
    const stopButton = this.container.querySelector('#stop-speaking-button') as HTMLButtonElement;
    const modeButton = this.container.querySelector('#mode-button') as HTMLButtonElement;
    const statusIndicator = this.container.querySelector('#voice-status') as HTMLElement;
    const transcriptDisplay = this.container.querySelector('#transcript-display') as HTMLElement;

    if (micButton) {
      if (state.isListening) {
        micButton.style.background = '#ef4444';
        micButton.innerHTML = this.getMicrophoneIcon() + ' Listening...';
        micButton.disabled = false;
      } else if (state.isSpeaking) {
        micButton.style.background = '#94a3b8';
        micButton.innerHTML = this.getMicrophoneIcon() + ' Speaking...';
        micButton.disabled = true;
      } else {
        micButton.style.background = state.isEnabled ? '#22c55e' : '#94a3b8';
        micButton.innerHTML = this.getMicrophoneIcon() + ' ' + (state.isEnabled ? 'Voice' : 'Disabled');
        micButton.disabled = !state.isEnabled;
      }
    }

    if (stopButton) {
      stopButton.style.display = state.isSpeaking ? 'flex' : 'none';
    }

    if (modeButton) {
      modeButton.innerHTML = state.currentMode === 'realtime' ? '⚡ Realtime' : '🎤 Traditional';
      modeButton.style.background = state.currentMode === 'realtime' ? '#8b5cf6' : '#64748b';
      modeButton.style.color = 'white';
    }

    if (statusIndicator) {
      const statusDot = statusIndicator.querySelector('.status-dot') as HTMLElement;
      const statusText = statusIndicator.querySelector('.status-text') as HTMLElement;
      
      if (statusDot && statusText) {
        if (state.isListening) {
          statusDot.style.background = '#ef4444';
          statusDot.style.animation = 'pulse 1s infinite';
          statusText.textContent = 'Listening...';
        } else if (state.isSpeaking) {
          statusDot.style.background = '#3b82f6';
          statusDot.style.animation = 'pulse 1s infinite';
          statusText.textContent = 'AI Speaking...';
        } else if (state.isEnabled) {
          statusDot.style.background = '#22c55e';
          statusDot.style.animation = 'none';
          statusText.textContent = state.currentMode === 'realtime' && state.isConnected ? 'Realtime Ready' : 'Voice Ready';
        } else {
          statusDot.style.background = '#94a3b8';
          statusDot.style.animation = 'none';
          statusText.textContent = 'Voice Disabled';
        }
      }
    }

    if (transcriptDisplay) {
      if (state.currentTranscript) {
        transcriptDisplay.textContent = `"${state.currentTranscript}"`;
        transcriptDisplay.style.opacity = '1';
      } else {
        transcriptDisplay.style.opacity = '0';
      }
    }
  }

  /**
   * Show transcript preview
   */
  showTranscript(text: string, isFinal: boolean) {
    const transcriptDisplay = this.container?.querySelector('#transcript-display') as HTMLElement;
    if (transcriptDisplay) {
      if (text && !isFinal) {
        transcriptDisplay.textContent = `"${text}"`;
        transcriptDisplay.style.opacity = '1';
      } else {
        transcriptDisplay.style.opacity = '0';
      }
    }
  }

  /**
   * Show error message
   */
  showError(error: string) {
    const statusText = this.container?.querySelector('.status-text') as HTMLElement;
    if (statusText) {
      statusText.textContent = `Error: ${error}`;
      statusText.style.color = '#ef4444';
      
      // Reset after 3 seconds
      setTimeout(() => {
        this.updateUI();
        statusText.style.color = '';
      }, 3000);
    }
  }

  /**
   * Get the voice controls HTML
   */
  private getVoiceControlsHTML(): string {
    const state = this.voiceChat.getState();
    const isSupported = this.voiceChat.isSupported();

    if (!isSupported) {
      return `
        <div style="
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          padding: 8px;
        ">
          Voice features not supported in this browser
        </div>
      `;
    }

    return `
      <!-- Voice Status -->
      <div id="voice-status" style="
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      ">
        <div class="status-dot" style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${state.isEnabled ? '#22c55e' : '#94a3b8'};
          transition: all 0.2s;
        "></div>
        <span class="status-text" style="
          font-size: 12px;
          color: #64748b;
          font-weight: 500;
        ">
          ${state.isEnabled ? 'Voice Ready' : 'Voice Disabled'}
        </span>
        
        <!-- Transcript Preview -->
        <div id="transcript-display" style="
          font-size: 12px;
          color: #3b82f6;
          font-style: italic;
          margin-left: 8px;
          opacity: 0;
          transition: opacity 0.2s;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        "></div>
      </div>

      <!-- Voice Controls -->
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        <!-- Microphone Button -->
        <button id="mic-button" style="
          background: ${state.isEnabled ? '#22c55e' : '#94a3b8'};
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: ${state.isEnabled ? 'pointer' : 'not-allowed'};
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
          min-width: 80px;
          justify-content: center;
        " ${!state.isEnabled ? 'disabled' : ''}>
          ${this.getMicrophoneIcon()}
          ${state.isEnabled ? 'Voice' : 'Disabled'}
        </button>

        <!-- Stop Speaking Button -->
        <button id="stop-speaking-button" style="
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: none;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        ">
          ${this.getStopIcon()}
          Stop
        </button>

        <!-- Mode Toggle Button -->
        <button id="mode-button" style="
          background: #64748b;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          cursor: pointer;
          font-size: 11px;
          font-weight: 500;
          transition: all 0.2s;
        ">
          🎤 Traditional
        </button>
      </div>

      <!-- CSS Animations -->
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        #mic-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        #stop-speaking-button:hover {
          background: #dc2626;
        }
        
        #mode-button:hover {
          background: #475569;
        }
      </style>
    `;
  }

  /**
   * Setup event listeners for voice controls
   */
  private setupEventListeners() {
    if (!this.container) return;

    const micButton = this.container.querySelector('#mic-button');
    const stopButton = this.container.querySelector('#stop-speaking-button');
    const modeButton = this.container.querySelector('#mode-button');

    // Microphone button
    micButton?.addEventListener('click', () => {
      this.config.onToggleListening?.();
    });

    // Stop speaking button
    stopButton?.addEventListener('click', () => {
      this.config.onStopSpeaking?.();
    });

    // Mode toggle button
    modeButton?.addEventListener('click', () => {
      const currentMode = this.voiceChat.getState().currentMode;
      const newMode: VoiceMode = currentMode === 'traditional' ? 'realtime' : 'traditional';
      this.config.onModeChange?.(newMode);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Space bar to toggle voice (when focused on chat)
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        const state = this.voiceChat.getState();
        if (state.isEnabled && !state.isSpeaking) {
          this.config.onToggleListening?.();
        }
      }
      
      // Escape to stop speaking
      if (e.code === 'Escape') {
        const state = this.voiceChat.getState();
        if (state.isSpeaking) {
          this.config.onStopSpeaking?.();
        }
      }
    });
  }

  /**
   * Get microphone icon SVG
   */
  private getMicrophoneIcon(): string {
    return `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" stroke="currentColor" stroke-width="2"/>
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" stroke="currentColor" stroke-width="2"/>
        <line x1="12" y1="19" x2="12" y2="23" stroke="currentColor" stroke-width="2"/>
        <line x1="8" y1="23" x2="16" y2="23" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  /**
   * Get stop icon SVG
   */
  private getStopIcon(): string {
    return `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink: 0;">
        <path d="M11 5L6 9H2v6h4l5 4V5z" stroke="currentColor" stroke-width="2"/>
        <line x1="23" y1="9" x2="17" y2="15" stroke="currentColor" stroke-width="2"/>
        <line x1="17" y1="9" x2="23" y2="15" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  /**
   * Destroy the UI component
   */
  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
