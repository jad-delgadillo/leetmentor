import { VoiceService } from '../../shared/voice-service';
import { RealtimeVoiceService } from '../../shared/realtime-voice-service';

export interface VoiceChatConfig {
  apiKey: string;
  model?: string;
  voice: {
    enabled: boolean;
    language: string;
    rate: number;
    pitch: number;
    volume: number;
  };
  speechRecognition: {
    enabled: boolean;
    language: string;
    continuous: boolean;
    interimResults: boolean;
  };
}

export interface VoiceChatEvents {
  onSpeechResult?: (text: string, isFinal: boolean) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onSpeakStart?: () => void;
  onSpeakEnd?: () => void;
  onError?: (error: string) => void;
}

export type VoiceMode = 'traditional' | 'realtime';

/**
 * VoiceChat Component
 * 
 * Handles voice conversation functionality for the AI interviewer.
 * Supports both traditional voice (Web Speech API + OpenAI) and
 * realtime voice (OpenAI Realtime API) modes.
 */
export class VoiceChat {
  private voiceService: VoiceService;
  private realtimeService: RealtimeVoiceService;
  private config: VoiceChatConfig | null = null;
  private events: VoiceChatEvents = {};
  private currentMode: VoiceMode = 'traditional';
  
  // State
  private isListening = false;
  private isSpeaking = false;
  private isEnabled = false;
  private currentTranscript = '';

  constructor() {
    console.log('🎤 VoiceChat: Initializing voice chat component...');
    
    try {
      this.voiceService = new VoiceService();
      this.realtimeService = RealtimeVoiceService.getInstance();
      this.setupVoiceServiceEvents();
      console.log('✅ VoiceChat: Voice services initialized successfully');
    } catch (error) {
      console.error('❌ VoiceChat: Failed to initialize voice services:', error);
      this.events.onError?.('Failed to initialize voice services');
    }
  }

  /**
   * Configure the voice chat with API keys and settings
   */
  configure(config: VoiceChatConfig) {
    this.config = config;
    this.isEnabled = config.voice.enabled && config.speechRecognition.enabled;

    if (!this.isEnabled) {
      console.log('🎤 VoiceChat: Voice features disabled in config');
      return;
    }

    if (!config.apiKey) {
      console.warn('⚠️ VoiceChat: No API key provided, voice features will be limited');
      this.isEnabled = false;
      return;
    }

    // Configure traditional voice service
    this.voiceService.setApiKey(config.apiKey);
    this.voiceService.setUseOpenAIVoice(true);
    this.voiceService.setUseOpenAIWhisper(true);

    // Configure realtime voice service
    this.realtimeService.setApiKey(config.apiKey);

    console.log('✅ VoiceChat: Configuration complete, voice mode:', this.currentMode);
  }

  /**
   * Set event handlers for voice interactions
   */
  setEvents(events: VoiceChatEvents) {
    this.events = events;
  }

  /**
   * Switch between voice modes
   */
  setVoiceMode(mode: VoiceMode) {
    console.log(`🎤 VoiceChat: Switching to ${mode} mode`);
    
    // Stop current activities before switching
    this.stopListening();
    this.stopSpeaking();
    
    this.currentMode = mode;
    
    if (mode === 'realtime') {
      this.setupRealtimeEvents();
    }
  }

  /**
   * Start listening for speech input
   */
  async startListening(): Promise<boolean> {
    if (!this.isEnabled || !this.config) {
      this.events.onError?.('Voice not configured or enabled');
      return false;
    }

    if (this.isListening) {
      console.log('🎤 VoiceChat: Already listening');
      return true;
    }

    try {
      console.log(`🎤 VoiceChat: Starting listening in ${this.currentMode} mode...`);

      if (this.currentMode === 'realtime') {
        // Use realtime API
        if (!this.realtimeService.getIsConnected()) {
          await this.realtimeService.connect();
        }
        await this.realtimeService.startListening(this.config.speechRecognition);
      } else {
        // Use traditional voice service
        await this.voiceService.startListening(this.config.speechRecognition);
      }

      this.isListening = true;
      console.log('✅ VoiceChat: Listening started successfully');
      return true;

    } catch (error) {
      console.error('❌ VoiceChat: Failed to start listening:', error);
      this.events.onError?.(`Failed to start listening: ${error}`);
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  stopListening() {
    if (!this.isListening) return;

    console.log('🎤 VoiceChat: Stopping listening...');

    if (this.currentMode === 'realtime') {
      this.realtimeService.stopListening();
    } else {
      this.voiceService.stopListening();
    }

    this.isListening = false;
  }

  /**
   * Speak text using AI voice
   */
  async speak(text: string): Promise<boolean> {
    if (!this.isEnabled || !this.config) {
      console.log('🎤 VoiceChat: Voice not enabled, skipping speech');
      return false;
    }

    if (this.isSpeaking) {
      this.stopSpeaking(); // Stop current speech
    }

    try {
      console.log('🗣️ VoiceChat: Speaking text:', text.substring(0, 50) + '...');

      if (this.currentMode === 'realtime') {
        // Realtime API handles speech automatically in conversation
        this.realtimeService.sendTextMessage(text);
      } else {
        // Use traditional TTS
        await this.voiceService.speak(text, this.config.voice);
      }

      return true;

    } catch (error) {
      console.error('❌ VoiceChat: Failed to speak:', error);
      this.events.onError?.(`Failed to speak: ${error}`);
      return false;
    }
  }

  /**
   * Stop current speech
   */
  stopSpeaking() {
    if (!this.isSpeaking) return;

    console.log('🗣️ VoiceChat: Stopping speech...');

    if (this.currentMode === 'realtime') {
      this.realtimeService.stopSpeaking();
    } else {
      this.voiceService.stopSpeaking();
    }

    this.isSpeaking = false;
  }

  /**
   * Get current voice state
   */
  getState() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      isEnabled: this.isEnabled,
      currentMode: this.currentMode,
      currentTranscript: this.currentTranscript,
      isConnected: this.currentMode === 'realtime' ? this.realtimeService.getIsConnected() : true
    };
  }

  /**
   * Check if voice features are supported
   */
  isSupported(): boolean {
    if (!this.voiceService) return false;
    const support = this.voiceService.isSupported();
    return support.speechRecognition && support.speechSynthesis;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    console.log('🎤 VoiceChat: Cleaning up...');
    
    this.stopListening();
    this.stopSpeaking();
    
    if (this.voiceService) {
      this.voiceService.destroy();
    }
    
    if (this.realtimeService) {
      this.realtimeService.disconnect();
    }
    
    this.isEnabled = false;
    this.config = null;
    this.events = {};
  }

  /**
   * Setup event handlers for traditional voice service
   */
  private setupVoiceServiceEvents() {
    if (!this.voiceService) return;

    this.voiceService.onSpeechResultReceived((text, isFinal) => {
      this.currentTranscript = isFinal ? '' : text;
      this.events.onSpeechResult?.(text, isFinal);
    });

    this.voiceService.onSpeechStarted(() => {
      this.isListening = true;
      this.events.onSpeechStart?.();
    });

    this.voiceService.onSpeechEnded(() => {
      this.isListening = false;
      this.events.onSpeechEnd?.();
    });

    this.voiceService.onSpeakStarted(() => {
      this.isSpeaking = true;
      this.events.onSpeakStart?.();
    });

    this.voiceService.onSpeakEnded(() => {
      this.isSpeaking = false;
      this.events.onSpeakEnd?.();
    });

    this.voiceService.onSpeechErrorOccurred((error) => {
      console.error('🎤 VoiceChat: Speech error:', error);
      this.isListening = false;
      this.events.onError?.(error);
    });
  }

  /**
   * Setup event handlers for realtime voice service
   */
  private setupRealtimeEvents() {
    if (!this.realtimeService) return;

    this.realtimeService.setEventHandlers({
      onSpeechResult: (text: string, isFinal: boolean) => {
        this.currentTranscript = isFinal ? '' : text;
        this.events.onSpeechResult?.(text, isFinal);
      },
      onSpeechStart: () => {
        this.isListening = true;
        this.events.onSpeechStart?.();
      },
      onSpeechEnd: () => {
        this.isListening = false;
        this.events.onSpeechEnd?.();
      },
      onSpeakStart: () => {
        this.isSpeaking = true;
        this.events.onSpeakStart?.();
      },
      onSpeakEnd: () => {
        this.isSpeaking = false;
        this.events.onSpeakEnd?.();
      },
      onSpeechError: (error: string) => {
        console.error('🎤 VoiceChat: Realtime speech error:', error);
        this.isListening = false;
        this.events.onError?.(error);
      }
    });
  }

  /**
   * Toggle listening state
   */
  async toggleListening(): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
      return false;
    } else {
      return await this.startListening();
    }
  }

  /**
   * Set voice speed/rate
   */
  setVoiceSpeed(rate: number) {
    if (!this.config) {
      console.warn('🎤 VoiceChat: Cannot set speed - not configured');
      return;
    }

    // Clamp rate between reasonable bounds
    const clampedRate = Math.min(Math.max(rate, 0.25), 4.0);

    console.log(`🎤 VoiceChat: Setting voice speed to ${clampedRate}x`);

    // Update config
    this.config.voice.rate = clampedRate;

    // Update voice service if using traditional mode
    if (this.voiceService) {
      this.voiceService.setSpeechRate(clampedRate);
    }

    // For realtime mode, the speed would need to be handled differently
    // but OpenAI Realtime API doesn't support speed control yet
    if (this.currentMode === 'realtime') {
      console.log('🎤 VoiceChat: Realtime mode - speed changes apply to future responses');
    }
  }

  /**
   * Get current voice speed
   */
  getVoiceSpeed(): number {
    return this.config?.voice.rate || 1.0;
  }

  /**
   * Get available voice modes
   */
  getAvailableModes(): VoiceMode[] {
    const modes: VoiceMode[] = ['traditional'];
    
    // Check if realtime is available (requires backend)
    if (this.config?.apiKey) {
      modes.push('realtime');
    }
    
    return modes;
  }
}
