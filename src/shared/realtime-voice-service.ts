import { VoiceSettings, SpeechRecognitionSettings } from '../types/api';

export class RealtimeVoiceService {
  private websocket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isConnected = false;
  private isListening = false;
  private isSpeaking = false;
  private apiKey: string = '';
  private sessionId: string = '';
  
  // Audio streaming
  private audioQueue: Float32Array[] = [];
  private isPlaying = false;
  private gainNode: GainNode | null = null;
  
  // Voice Activity Detection
  private vadEnabled = true;
  private speechStartThreshold = 0.01;
  private speechEndTimeout = 1000; // 1 second of silence to stop
  private speechEndTimer: NodeJS.Timeout | null = null;
  
  // Event handlers
  private onSpeechResult?: (text: string, isFinal: boolean) => void;
  private onSpeechError?: (error: string) => void;
  private onSpeechStart?: () => void;
  private onSpeechEnd?: () => void;
  private onSpeakStart?: () => void;
  private onSpeakEnd?: () => void;

  constructor() {
    this.initializeAudioContext();
  }

  private async initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000 // OpenAI Realtime uses 24kHz
      });
      
      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('LeetMentor Realtime: Audio context initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
    }
  }

  // Configuration
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  // Event listeners
  setEventHandlers(handlers: {
    onSpeechResult?: (text: string, isFinal: boolean) => void;
    onSpeechError?: (error: string) => void;
    onSpeechStart?: () => void;
    onSpeechEnd?: () => void;
    onSpeakStart?: () => void;
    onSpeakEnd?: () => void;
  }) {
    this.onSpeechResult = handlers.onSpeechResult;
    this.onSpeechError = handlers.onSpeechError;
    this.onSpeechStart = handlers.onSpeechStart;
    this.onSpeechEnd = handlers.onSpeechEnd;
    this.onSpeakStart = handlers.onSpeakStart;
    this.onSpeakEnd = handlers.onSpeakEnd;
  }

  // Connection Management
  async connect(): Promise<void> {
    if (this.isConnected) return;
    
    try {
      console.log('LeetMentor Realtime: Attempting to connect to OpenAI Realtime API...');
      
      // Note: OpenAI Realtime API may not support direct browser connections
      // This is a limitation of browser WebSocket security and CORS policies
      console.warn('LeetMentor Realtime: Browser-based Realtime API connection is experimental');
      
      throw new Error('Realtime API requires server-side implementation for browser compatibility');
      
    } catch (error) {
      console.error('Failed to connect to Realtime API:', error);
      console.log('LeetMentor Realtime: Falling back to traditional voice service');
      this.onSpeechError?.('Realtime API not available in browser - using traditional voice');
      throw error;
    }
  }

  private initializeSession() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Initialize session with voice settings
    const sessionConfig = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        instructions: 'You are an AI interviewer helping with coding interview practice. Be conversational, encouraging, and provide helpful feedback. Use natural speech patterns with appropriate pauses and emphasis.',
        voice: 'alloy', // Closest to conversational feel
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1'
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        },
        tools: [],
        tool_choice: 'none',
        temperature: 0.8,
        max_response_output_tokens: 4096
      }
    };

    this.websocket.send(JSON.stringify(sessionConfig));
    console.log('LeetMentor Realtime: Session initialized');
  }

  private handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'session.created':
        this.sessionId = message.session.id;
        console.log('LeetMentor Realtime: Session created:', this.sessionId);
        break;

      case 'input_audio_buffer.speech_started':
        console.log('LeetMentor Realtime: Speech started');
        this.isListening = true;
        this.onSpeechStart?.();
        // Stop any current AI speech (barge-in)
        this.interruptSpeech();
        break;

      case 'input_audio_buffer.speech_stopped':
        console.log('LeetMentor Realtime: Speech stopped');
        this.isListening = false;
        this.onSpeechEnd?.();
        break;

      case 'conversation.item.input_audio_transcription.completed':
        const transcript = message.transcript;
        console.log('LeetMentor Realtime: Transcript:', transcript);
        this.onSpeechResult?.(transcript, true);
        break;

      case 'response.audio.delta':
        // Streaming audio chunks!
        this.handleAudioDelta(message.delta);
        break;

      case 'response.audio.done':
        console.log('LeetMentor Realtime: Audio response complete');
        this.isSpeaking = false;
        this.onSpeakEnd?.();
        break;

      case 'response.done':
        console.log('LeetMentor Realtime: Response complete');
        break;

      case 'error':
        console.error('LeetMentor Realtime: Error:', message.error);
        this.onSpeechError?.(message.error.message);
        break;

      default:
        // console.log('LeetMentor Realtime: Unhandled message:', message.type);
    }
  }

  // Audio streaming (the magic!)
  private handleAudioDelta(deltaBase64: string) {
    if (!this.audioContext || !this.gainNode) return;

    try {
      // Decode base64 audio data
      const binaryString = atob(deltaBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert to Float32Array (PCM16 to Float32)
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0; // Convert to -1.0 to 1.0 range
      }

      // Queue audio for immediate playback
      this.audioQueue.push(float32);
      
      if (!this.isPlaying) {
        this.startAudioPlayback();
      }

    } catch (error) {
      console.error('Error processing audio delta:', error);
    }
  }

  private startAudioPlayback() {
    if (!this.audioContext || !this.gainNode || this.isPlaying) return;

    this.isPlaying = true;
    this.isSpeaking = true;
    this.onSpeakStart?.();

    const playNextChunk = () => {
      if (this.audioQueue.length === 0) {
        this.isPlaying = false;
        if (!this.isSpeaking) {
          this.onSpeakEnd?.();
        }
        return;
      }

      const audioData = this.audioQueue.shift()!;
      const audioBuffer = this.audioContext!.createBuffer(1, audioData.length, 24000);
      audioBuffer.copyToChannel(new Float32Array(audioData), 0);

      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode!);
      
      source.onended = () => {
        playNextChunk();
      };

      source.start();
    };

    playNextChunk();
  }

  // Voice Activity Detection & Recording
  async startListening(settings: SpeechRecognitionSettings) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (!this.audioContext) return;

      // Create audio processing pipeline
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      // Create simple VAD using ScriptProcessorNode (deprecated but works)
      const processor = this.audioContext.createScriptProcessor(1024, 1, 1);
      
      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Simple VAD based on RMS energy
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        
        // Send audio to OpenAI (convert to PCM16)
        this.sendAudioToRealtime(inputData);
        
        // Voice activity detection
        if (this.vadEnabled) {
          if (rms > this.speechStartThreshold) {
            if (this.speechEndTimer) {
              clearTimeout(this.speechEndTimer);
              this.speechEndTimer = null;
            }
          } else {
            if (!this.speechEndTimer && this.isListening) {
              this.speechEndTimer = setTimeout(() => {
                // Silence detected
                this.sendSilenceToRealtime();
              }, this.speechEndTimeout);
            }
          }
        }
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      console.log('LeetMentor Realtime: Microphone activated with VAD');

    } catch (error) {
      console.error('Failed to start realtime listening:', error);
      this.onSpeechError?.('Failed to access microphone');
    }
  }

  private sendAudioToRealtime(float32Data: Float32Array) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Convert Float32 to PCM16
    const pcm16 = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      pcm16[i] = Math.max(-32768, Math.min(32767, float32Data[i] * 32768));
    }

    // Convert to base64
    const bytes = new Uint8Array(pcm16.buffer);
    const base64 = btoa(String.fromCharCode(...bytes));

    const audioMessage = {
      type: 'input_audio_buffer.append',
      audio: base64
    };

    this.websocket.send(JSON.stringify(audioMessage));
  }

  private sendSilenceToRealtime() {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    // Commit the audio buffer (tells OpenAI to process what we've sent)
    const commitMessage = {
      type: 'input_audio_buffer.commit'
    };

    this.websocket.send(JSON.stringify(commitMessage));
    console.log('LeetMentor Realtime: Audio committed for processing');
  }

  // Barge-in support
  interruptSpeech() {
    if (!this.isSpeaking) return;

    // Clear audio queue
    this.audioQueue = [];
    this.isPlaying = false;
    this.isSpeaking = false;

    // Stop current response
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const cancelMessage = {
        type: 'response.cancel'
      };
      this.websocket.send(JSON.stringify(cancelMessage));
    }

    console.log('LeetMentor Realtime: Speech interrupted (barge-in)');
  }

  stopListening() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.speechEndTimer) {
      clearTimeout(this.speechEndTimer);
      this.speechEndTimer = null;
    }

    console.log('LeetMentor Realtime: Stopped listening');
  }

  stopSpeaking() {
    this.interruptSpeech();
  }

  // Send text message (for when user types instead of speaks)
  sendTextMessage(message: string) {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;

    const textMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: message
          }
        ]
      }
    };

    this.websocket.send(JSON.stringify(textMessage));

    // Trigger response
    const responseMessage = {
      type: 'response.create',
      response: {
        modalities: ['text', 'audio']
      }
    };

    this.websocket.send(JSON.stringify(responseMessage));
  }

  // Cleanup
  disconnect() {
    this.stopListening();
    this.stopSpeaking();

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isConnected = false;
    console.log('LeetMentor Realtime: Disconnected and cleaned up');
  }

  // Status getters
  getIsConnected(): boolean {
    return this.isConnected;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}
