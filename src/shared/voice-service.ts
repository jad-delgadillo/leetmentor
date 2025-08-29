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
    
    // Prioritize Whisper for better accent recognition when API key is available
    console.log('🎤 VoiceService: Initialized with accent-friendly settings. Whisper will be used when API key is available for better Mexican English accent recognition.');
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
        const result = event.results[i];
        
        // For Mexican English accent tolerance, check multiple alternatives
        let bestTranscript = result[0].transcript;
        let bestConfidence = result[0].confidence || 0;
        
        console.log(`🎤 Speech alternatives for result ${i}:`);
        
        // Check all available alternatives and log them
        for (let j = 0; j < Math.min(result.length, 5); j++) {
          const alternative = result[j];
          const confidence = alternative.confidence || 0;
          console.log(`  Alternative ${j}: "${alternative.transcript}" (confidence: ${confidence})`);
          
          // For Mexican English, sometimes lower confidence alternatives are more accurate
          // Use a smarter selection that considers common accent patterns
          if (j > 0 && this.isLikelyBetterForMexicanEnglish(alternative.transcript, bestTranscript, confidence, bestConfidence)) {
            bestTranscript = alternative.transcript;
            bestConfidence = confidence;
            console.log(`  ✅ Selected alternative ${j} as better for Mexican English`);
          }
        }
        
        console.log(`🎤 Final selection: "${bestTranscript}" (confidence: ${bestConfidence})`);
        
        if (result.isFinal) {
          finalTranscript += bestTranscript;
        } else {
          interimTranscript += bestTranscript;
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

    console.log('🎤 VoiceService: Starting speech recognition...');
    console.log('🎤 API Key available:', !!this.apiKey);
    console.log('🎤 Use Whisper setting:', this.useOpenAIWhisper);

    // Use OpenAI Whisper for better accent recognition if API key is available
    if (this.useOpenAIWhisper && this.apiKey) {
      try {
        console.log('🎤 Attempting to use Whisper for Mexican English accent recognition...');
        await this.startWhisperListening(settings);
        console.log('✅ Successfully started Whisper listening');
        return;
      } catch (error) {
        console.warn('❌ Whisper failed, falling back to browser recognition:', error);
        // Fall back to browser recognition
      }
    } else {
      console.log('🎤 Using browser speech recognition (Whisper not available)');
    }

    // Browser speech recognition fallback
    if (!this.recognition) {
      throw new Error('Speech recognition not supported in this browser');
    }

    // Configure specifically for Mexican English accent
    // Try multiple language variants for better accent recognition
    const accentFriendlyLanguages = [
      'en-US', // Primary
      'en',    // Generic English
      'es-MX', // Mexican Spanish (for code-switching)
      'en-MX'  // Mexican English if supported
    ];
    
    this.recognition.lang = settings.language || 'en-US';
    this.recognition.continuous = true; // Always use continuous for longer messages
    this.recognition.interimResults = true; // Always show interim results
    this.recognition.maxAlternatives = 5; // Get more alternatives for accent tolerance
    
    // Extend silence delay for non-native speakers who may speak slower
    this.silenceDelay = 4000; // Increased to 4 seconds for Mexican English patterns
    
    console.log('🎤 Browser recognition configured for Mexican English:', {
      language: this.recognition.lang,
      continuous: this.recognition.continuous,
      maxAlternatives: this.recognition.maxAlternatives,
      silenceDelay: this.silenceDelay
    });
    
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
    formData.append('language', 'en'); // English for Mexican-English speakers
    formData.append('response_format', 'verbose_json'); // Get more detailed results
    
    // Add prompt to help with Mexican English accent recognition
    formData.append('prompt', 'This is a conversation about coding and programming concepts. The speaker may have a Mexican English accent. Common technical terms: algorithm, function, variable, array, string, integer, boolean, loop, condition, complexity, solution, problem, test case, edge case, runtime, space, time, Big O notation.');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whisper API error details:', errorText);
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('🎤 Whisper transcription confidence:', result.segments?.map(s => s.avg_logprob) || 'N/A');
    
    return result.text || '';
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

      // Configure voice settings for more natural conversational speech
      utterance.rate = (settings.rate || 1.0) * this.speechRate; // Apply speech rate multiplier
      utterance.pitch = settings.pitch || 1.1; // Slightly higher pitch for conversational tone
      utterance.volume = settings.volume || 0.85; // Slightly lower volume for natural conversation
      utterance.lang = settings.language || 'en-US';

      // Add natural speech patterns
      utterance.rate = Math.min(utterance.rate, 1.3); // Cap rate for clarity in conversations

      // Find the best professional female voice for interviewer experience
      const interviewerVoice = this.findBestVoice();
      if (interviewerVoice) {
        utterance.voice = interviewerVoice;
        console.log('🎤 Using interviewer voice:', interviewerVoice.name);
      } else {
        console.log('🎤 No suitable interviewer voice found, using default');
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

  private findBestVoice(): SpeechSynthesisVoice | null {
    // Preferred professional female voices for interviewer experience
    const preferredFemaleVoices = [
      'Samantha', // macOS - professional female voice
      'Susan', // macOS - warm female voice
      'Victoria', // macOS - clear female voice
      'Karen', // macOS - professional female
      'Microsoft Zira - English (United States)', // Windows - natural female
      'Microsoft Eva - English (United States)', // Windows - clear female
      'Google US English Female', // Chrome - natural female
      'en-US-Female' // Generic female
    ];

    // First try to find exact matches for professional female voices
    for (const voiceName of preferredFemaleVoices) {
      const voice = this.voices.find(v => v.name === voiceName);
      if (voice) {
        return voice;
      }
    }

    // If no exact match, find any female-sounding US voice
    const femaleKeywords = ['female', 'woman', 'samantha', 'susan', 'karen', 'zira', 'eva', 'victoria'];
    const femaleVoice = this.voices.find(v =>
      v.lang.startsWith('en-US') &&
      femaleKeywords.some(keyword => v.name.toLowerCase().includes(keyword))
    );

    if (femaleVoice) {
      return femaleVoice;
    }

    // Fallback to any US voice that sounds professional
    const professionalVoice = this.voices.find(v =>
      v.lang.startsWith('en-US') &&
      !v.name.toLowerCase().includes('male') &&
      !v.name.toLowerCase().includes('man') &&
      !v.name.toLowerCase().includes('boy')
    );

    if (professionalVoice) {
      return professionalVoice;
    }

    // Final fallback to any US voice
    return this.voices.find(v => v.lang.startsWith('en-US')) || null;
  }

  private isLikelyBetterForMexicanEnglish(newTranscript: string, currentBest: string, newConfidence: number, bestConfidence: number): boolean {
    // Common Mexican English pronunciation patterns that might have lower confidence but be more accurate
    const techTerms = [
      'algorithm', 'variable', 'function', 'array', 'string', 'integer', 'boolean', 
      'complexity', 'solution', 'problem', 'runtime', 'space', 'time', 'loop',
      'condition', 'edge case', 'test case', 'big o', 'notation'
    ];
    
    const newLower = newTranscript.toLowerCase();
    const currentLower = currentBest.toLowerCase();
    
    // Count technical terms in each alternative
    const newTechTermCount = techTerms.filter(term => newLower.includes(term)).length;
    const currentTechTermCount = techTerms.filter(term => currentLower.includes(term)).length;
    
    // If the new alternative has more technical terms, it might be better even with lower confidence
    if (newTechTermCount > currentTechTermCount && newConfidence > 0.3) {
      return true;
    }
    
    // If confidence is reasonably close (within 0.2) and the new one seems more coherent
    if (Math.abs(newConfidence - bestConfidence) < 0.2) {
      // Prefer alternatives that are longer (more complete thoughts)
      if (newTranscript.length > currentBest.length * 1.2) {
        return true;
      }
      
      // Prefer alternatives with better English word patterns
      if (this.hasMoreEnglishPatterns(newTranscript, currentBest)) {
        return true;
      }
    }
    
    return false;
  }

  private hasMoreEnglishPatterns(text1: string, text2: string): boolean {
    // Simple heuristic: count common English patterns
    const englishPatterns = [
      /\b(the|and|or|but|if|when|then|this|that|with|for|from|to|in|on|at)\b/gi,
      /\b(i|you|we|they|it|he|she)\b/gi,
      /\b(can|could|should|would|will|might|may)\b/gi
    ];
    
    let score1 = 0;
    let score2 = 0;
    
    englishPatterns.forEach(pattern => {
      score1 += (text1.match(pattern) || []).length;
      score2 += (text2.match(pattern) || []).length;
    });
    
    return score1 > score2;
  }

  private getOpenAIVoice(language: string): string {
    // Map language to best OpenAI female voice for natural interviewer experience
    const voiceMap: Record<string, string> = {
      'en-US': 'nova',    // Female, warm, American voice - most natural for interviews
      'en-GB': 'echo',    // British accent
      'es-ES': 'nova',    // Works well for Spanish
      'fr-FR': 'shimmer', // Good for French
      'de-DE': 'onyx',    // Professional for German
      'zh-CN': 'alloy',   // Professional for Chinese
      'ja-JP': 'shimmer', // Good for Japanese
      'ko-KR': 'nova'     // Good for Korean
    };

    return voiceMap[language] || 'nova'; // Default to nova (female, natural voice)
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
