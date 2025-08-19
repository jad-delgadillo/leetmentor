import { VoiceSettings, SpeechRecognitionSettings } from '../types/api';
import { SPEECH_SETTINGS } from './constants';

export class VoiceService {
  private synthesis: SpeechSynthesis;
  private recognition: SpeechRecognition | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isListening = false;
  private isSpeaking = false;
  private apiKey: string = '';
  private useOpenAIVoice: boolean = true;
  private useOpenAIWhisper: boolean = true; // Use Whisper for better accent recognition
  private currentAudio: HTMLAudioElement | null = null;
  private speechTimeout: NodeJS.Timeout | null = null;
  private lastFinalTranscript = '';
  private silenceDelay = 2000; // Wait 2 seconds of silence before considering speech complete
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private speechRate: number = 1.0; // Speech speed multiplier (1x, 1.25x, 1.5x, 2x)

  // Event handlers
  private onSpeechResult?: (text: string, isFinal: boolean) => void;
  private onSpeechError?: (error: string) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onSpeakStart?: () => void;
  private onSpeakEnd?: () => void;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
    this.loadVoices();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new SpeechRecognition();
    }

    if (this.recognition) {
      this.setupSpeechRecognitionEvents();
    }
  }

  private setupSpeechRecognitionEvents() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onSpeechStart?.();
      console.log('LeetMentor: Speech recognition started');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onSpeechEnd?.();
      console.log('LeetMentor: Speech recognition ended');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Clear any existing timeout
      if (this.speechTimeout) {
        clearTimeout(this.speechTimeout);
        this.speechTimeout = null;
      }

      if (finalTranscript) {
        this.lastFinalTranscript += finalTranscript;
        console.log('LeetMentor: Accumulated final transcript:', this.lastFinalTranscript);
        
        // Set timeout to send the complete message after a pause
        this.speechTimeout = setTimeout(() => {
          if (this.lastFinalTranscript.trim()) {
            console.log('LeetMentor: Sending complete speech after pause:', this.lastFinalTranscript);
            this.onSpeechResult?.(this.lastFinalTranscript.trim(), true);
            this.lastFinalTranscript = '';
          }
          this.speechTimeout = null;
        }, this.silenceDelay);
        
        // Also show interim result with current accumulated text
        this.onSpeechResult?.(this.lastFinalTranscript, false);
      } else if (interimTranscript) {
        // Show interim results along with accumulated final text
        const fullInterim = this.lastFinalTranscript + interimTranscript;
        this.onSpeechResult?.(fullInterim, false);
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;
      this.onSpeechError?.(event.error);
    };
  }

  private loadVoices() {
    const updateVoices = () => {
      this.voices = this.synthesis.getVoices();
    };

    updateVoices();
    
    // Voices might load asynchronously
    this.synthesis.onvoiceschanged = updateVoices;
  }

  // Speech Recognition Methods
  async startListening(settings: SpeechRecognitionSettings) {
    if (this.isListening) {
      this.stopListening();
    }

    // Use OpenAI Whisper for better accent recognition if API key is available
    if (this.useOpenAIWhisper && this.apiKey) {
      try {
        await this.startWhisperListening(settings);
        return;
      } catch (error) {
        console.warn('Whisper failed, falling back to browser recognition:', error);
        // Fall back to browser recognition
      }
    }

    // Browser speech recognition fallback
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    // Configure for longer utterances and better conversation flow
    this.recognition.lang = settings.language;
    this.recognition.continuous = true; // Always use continuous for longer messages
    this.recognition.interimResults = true; // Always show interim results
    this.recognition.maxAlternatives = 1;
    
    try {
      console.log('LeetMentor: Starting browser speech recognition with settings:', {
        language: this.recognition.lang,
        continuous: this.recognition.continuous,
        interimResults: this.recognition.interimResults
      });
      this.recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      throw new Error('Failed to start speech recognition');
    }
  }

  private async startWhisperListening(settings: SpeechRecognitionSettings) {
    console.log('LeetMentor: Starting Whisper speech recognition for better accent support');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const transcription = await this.transcribeWithWhisper(audioBlob, settings.language);
          
          if (transcription.trim()) {
            console.log('LeetMentor: Whisper transcription:', transcription);
            this.onSpeechResult?.(transcription.trim(), true);
          }
        } catch (error) {
          console.error('Whisper transcription error:', error);
          this.onSpeechError?.('Transcription failed');
        }
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.onstart = () => {
        this.isListening = true;
        this.onSpeechStart?.();
      };

      // Start recording
      this.mediaRecorder.start();
      
      // Note: Recording will continue until manually stopped - no time limit

    } catch (error) {
      console.error('Failed to start Whisper recording:', error);
      throw error;
    }
  }

  private async transcribeWithWhisper(audioBlob: Blob, language: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', language.split('-')[0]); // Convert 'en-US' to 'en'
    formData.append('response_format', 'text');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    return await response.text();
  }

  stopListening() {
    // Stop MediaRecorder if using Whisper
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      this.isListening = false;
      this.onSpeechEnd?.();
      return;
    }

    // Stop browser speech recognition
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
    
    // Clear speech timeout and send any accumulated text
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
      
      if (this.lastFinalTranscript.trim()) {
        console.log('LeetMentor: Sending accumulated speech on stop:', this.lastFinalTranscript);
        this.onSpeechResult?.(this.lastFinalTranscript.trim(), true);
        this.lastFinalTranscript = '';
      }
    }
  }

  // Text-to-Speech Methods
  async speak(text: string, settings: VoiceSettings): Promise<void> {
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    // Use OpenAI TTS if API key is available and enabled
    if (this.useOpenAIVoice && this.apiKey) {
      try {
        await this.speakWithOpenAI(text, settings);
        return;
      } catch (error) {
        console.warn('OpenAI TTS failed, falling back to browser TTS:', error);
        // Fall back to browser TTS
      }
    }

    // Browser TTS fallback
    return this.speakWithBrowser(text, settings);
  }

  private async speakWithOpenAI(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        this.isSpeaking = true;
        this.onSpeakStart?.();

        // OpenAI TTS API call
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: text,
            voice: this.getOpenAIVoice(settings.language), // nova, alloy, echo, fable, onyx, shimmer
            speed: this.speechRate
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI TTS API error: ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.currentAudio = new Audio(audioUrl);
        this.currentAudio.volume = settings.volume || 1.0;

        this.currentAudio.onended = () => {
          this.isSpeaking = false;
          this.onSpeakEnd?.();
          URL.revokeObjectURL(audioUrl);
          resolve();
        };

        this.currentAudio.onerror = () => {
          this.isSpeaking = false;
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };

        await this.currentAudio.play();

      } catch (error) {
        this.isSpeaking = false;
        reject(error);
      }
    });
  }

  private async speakWithBrowser(text: string, settings: VoiceSettings): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings
      utterance.rate = this.speechRate;
      utterance.pitch = settings.pitch || SPEECH_SETTINGS.DEFAULT_PITCH;
      utterance.volume = settings.volume || SPEECH_SETTINGS.DEFAULT_VOLUME;
      utterance.lang = settings.language;

      // Set voice if specified and available
      if (settings.voice) {
        const voice = this.voices.find(v => v.name === settings.voice?.name);
        if (voice) {
          utterance.voice = voice;
        }
      } else {
        // Find best voice for the language
        const voice = this.voices.find(v => v.lang.startsWith(settings.language));
        if (voice) {
          utterance.voice = voice;
        }
      }

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.onSpeakStart?.();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.onSpeakEnd?.();
        resolve();
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synthesis.speak(utterance);
    });
  }

  private getOpenAIVoice(language: string): string {
    // Map language to best OpenAI voice for conversational experience
    const voiceMap: Record<string, string> = {
      'en-US': 'nova',    // Female, warm, American voice (closest to "maple")
      'en-GB': 'echo',    // British accent
      'es-ES': 'nova',    // Works well for Spanish
      'fr-FR': 'shimmer', // Good for French
      'de-DE': 'onyx',    // Deep voice for German
      'zh-CN': 'alloy',   // Works for Chinese
      'ja-JP': 'shimmer', // Good for Japanese
      'ko-KR': 'nova'     // Good for Korean
    };

    return voiceMap[language] || 'nova'; // Default to nova (female, American)
  }

  stopSpeaking() {
    if (this.isSpeaking) {
      // Stop OpenAI audio if playing
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }
      
      // Stop browser synthesis
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  // Utility Methods
  isSupported(): { speechRecognition: boolean; speechSynthesis: boolean } {
    return {
      speechRecognition: !!this.recognition,
      speechSynthesis: 'speechSynthesis' in window
    };
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getVoicesForLanguage(language: string): SpeechSynthesisVoice[] {
    return this.voices.filter(voice => voice.lang.startsWith(language));
  }

  getState(): { isListening: boolean; isSpeaking: boolean } {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking
    };
  }

  // Event Handlers
  onSpeechResultReceived(handler: (text: string, isFinal: boolean) => void) {
    this.onSpeechResult = handler;
  }

  onSpeechErrorOccurred(handler: (error: string) => void) {
    this.onSpeechError = handler;
  }

  onSpeechStarted(handler: () => void) {
    this.onSpeechStart = handler;
  }

  onSpeechEnded(handler: () => void) {
    this.onSpeechEnd = handler;
  }

  onSpeakStarted(handler: () => void) {
    this.onSpeakStart = handler;
  }

  onSpeakEnded(handler: () => void) {
    this.onSpeakEnd = handler;
  }

  // Configuration Methods
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  setUseOpenAIVoice(enabled: boolean) {
    this.useOpenAIVoice = enabled;
  }

  setUseOpenAIWhisper(enabled: boolean) {
    this.useOpenAIWhisper = enabled;
  }

  // Speech Rate Control
  setSpeechRate(rate: number) {
    // Clamp rate between 0.25 and 4.0 for OpenAI, and 0.1 to 10 for browser
    this.speechRate = Math.min(Math.max(rate, 0.25), 4.0);
    
    // If currently speaking with browser TTS, update the rate immediately
    if (this.isSpeaking && this.synthesis.speaking) {
      // For browser synthesis, we need to restart with new rate
      const currentUtterances = this.synthesis.getVoices();
      // Note: Browser TTS doesn't support changing rate mid-speech,
      // but we store the new rate for next utterance
      console.log('LeetMentor: Speech rate updated to', this.speechRate, '(will apply to next speech)');
    }
  }

  getSpeechRate(): number {
    return this.speechRate;
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.stopSpeaking();
    
    // Clear any pending timeouts
    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
      this.speechTimeout = null;
    }
    
    this.onSpeechResult = undefined;
    this.onSpeechError = undefined;
    this.onSpeechStart = undefined;
    this.onSpeechEnd = undefined;
    this.onSpeakStart = undefined;
    this.onSpeakEnd = undefined;
  }
}
